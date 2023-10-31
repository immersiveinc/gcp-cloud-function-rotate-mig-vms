import * as ff from '@google-cloud/functions-framework'
import { RotateMIGOptions, getMIG, rotateMIG, validateRotateMIGOptions } from './gcp-mig-utils'
import { getErrorMessage } from './utils'

ff.http('rotateManagedInstanceGroupVMs', async (req: ff.Request, res: ff.Response) => {
  try {
    console.log(`received request:`)
    if (req.method !== 'POST') {
      throw new Error('support POST only')
    }
    const rotateMIGOptions = await validateRotateMIGOptions(req.body)
    const mig = await getMIG(rotateMIGOptions.instanceGroupManager)
    if (!mig) {
      throw new Error(`MIG: ${rotateMIGOptions.instanceGroupManager} not found`)
    }
    const resp = await rotateMIG(mig, rotateMIGOptions)
    res.send(resp)
  } catch (error) {
    res.status(500).send({ errMsg: getErrorMessage(error) })
  }
})
