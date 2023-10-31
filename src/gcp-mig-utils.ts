import { RegionInstanceGroupManagersClient, protos } from '@google-cloud/compute'
import { IsInt, IsOptional, IsString, validate } from 'class-validator'
import * as fs from 'fs'
import { PROJECT, REGION } from './consts'

export class RotateMIGOptions {
  @IsString()
  instanceGroupManager: string

  @IsOptional()
  @IsInt()
  maxSurge?: number

  @IsOptional()
  @IsInt()
  maxUnavailable?: number
}

export async function validateRotateMIGOptions(options: RotateMIGOptions) {
  let rotateMIGOptions = new RotateMIGOptions()
  rotateMIGOptions.instanceGroupManager = options.instanceGroupManager
  rotateMIGOptions.maxSurge = options.maxSurge
  rotateMIGOptions.maxUnavailable = options.maxUnavailable
  const errors = await validate(rotateMIGOptions)
  if (errors.length > 0) {
    console.log('validation failed. errors: ', errors)
    throw new Error(errors.map((x) => x.toString()).join('\n'))
  }
  return rotateMIGOptions
}

const computeClient = new RegionInstanceGroupManagersClient()

export async function getMIG(instanceGroupManager: string) {
  const response = await computeClient.get({
    instanceGroupManager,
    project: PROJECT,
    region: REGION,
  })
  // await fs.promises.writeFile('mig.json', JSON.stringify(response))
  console.log(`getMIG response: ${JSON.stringify(response)}`)
  return response[0]
}

export async function rotateMIG(
  mig: protos.google.cloud.compute.v1.IInstanceGroupManager,
  rotateMIGOptions: RotateMIGOptions,
) {
  const instanceTemplate = mig.versions?.[0].instanceTemplate
  const zoneCount = mig.distributionPolicy?.zones?.length ?? 1
  const maxSurge = (() => {
    if (typeof rotateMIGOptions.maxSurge === 'number') {
      return rotateMIGOptions.maxSurge
    }
    if (typeof mig.targetSize === 'number') {
      return Math.max(Math.floor(mig.targetSize / 2), zoneCount * 2)
    }
    throw new Error('maxSurge calc failed')
  })()
  const maxUnavailable = (() => {
    if (typeof rotateMIGOptions.maxUnavailable === 'number') {
      return rotateMIGOptions.maxUnavailable
    }
    if (typeof mig.targetSize === 'number') {
      return Math.max(Math.floor(mig.targetSize / 5), zoneCount)
    }
    throw new Error('maxUnavailable calc failed')
  })()
  const response = await computeClient.patch({
    instanceGroupManager: mig.name,
    project: PROJECT,
    region: REGION,
    instanceGroupManagerResource: {
      updatePolicy: {
        maxSurge: {
          fixed: maxSurge,
        },
        maxUnavailable: {
          fixed: maxUnavailable,
        },
        minimalAction: 'REPLACE',
        replacementMethod: 'SUBSTITUTE',
        type: 'PROACTIVE',
      },
      versions: [
        {
          instanceTemplate,
          name: (Math.random() + 1).toString(36).substring(7),
        },
      ],
    },
  })
  // await fs.promises.writeFile('mig-rotate-response.json', JSON.stringify(response))
  console.log(`patch MIG response: ${JSON.stringify(response)}`)
  if (response[0].error) {
    throw new Error(`failed to patch MIG, reason: ${response[0].error}`)
  }
  console.log(`started rotating MIG: ${rotateMIGOptions.instanceGroupManager}`)
  return response[0]
}
