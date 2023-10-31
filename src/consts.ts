export const PROJECT = process.env.PROJECT
export const REGION = process.env.REGION

if (!PROJECT) {
	throw new Error("missing env PROJECT")
}

if (!REGION) {
	throw new Error("missing env REGION")
}
