import { NextApiRequest, NextApiResponse } from "next"
import { getSession } from "next-auth/client"
import qs from "qs"

import { axiosClient } from "../../../../features/app"

import { REQUEST_DESC_HEADER_NAME } from "../../../../constants/http"
import { getResponseFromError } from "../../../../utils/httpRequestUtils"
import {
  DATASET_DV_TYPE,
  DATAVERSE_HEADER_NAME,
  PUBLICATION_STATUSES,
} from "../../../../constants/dataverse"
import { createInitialAnnotationText } from "../../../../utils/hypothesisUtils"

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "POST") {
    const session = await getSession({ req })
    if (session) {
      const { id } = req.query
      const {
        destinationUrl,
        destinationHypothesisGroup,
        privateAnnotation,
        manuscriptId,
        datasetDoi,
      } = req.body
      const { dataverseApiToken, hypothesisApiToken, hypothesisUserId } = session
      const requestDesc = `Creating ATI annotation for data project ${id}`
      try {
        const [titleAnnResponse, myDataResponse] = await Promise.all([
          axiosClient.get(
            `${process.env.ARCORE_SERVER_URL}/api/documents/${manuscriptId}/titleann`,
            {
              headers: {
                [DATAVERSE_HEADER_NAME]: dataverseApiToken as string,
                [REQUEST_DESC_HEADER_NAME]: `Getting title annotation from source manuscript ${manuscriptId}`,
                Accept: "application/json",
              },
            }
          ),
          axiosClient.get(`${process.env.DATAVERSE_SERVER_URL}/api/mydata/retrieve`, {
            params: {
              key: dataverseApiToken,
              dvobject_types: DATASET_DV_TYPE,
              published_states: PUBLICATION_STATUSES,
              mydata_search_term: `"${datasetDoi}"`,
            },
            paramsSerializer: {
              serialize: (params) => {
                return qs.stringify(params, { indices: false })
              },
            },
            headers: {
              [REQUEST_DESC_HEADER_NAME]: `Searching for data project ${datasetDoi}`,
              Accept: "application/json",
            },
          }),
        ])

        if (!myDataResponse.data.success || myDataResponse.data.data.items.length === 0) {
          res
            .status(404)
            .json({ message: `Unable to find data project ${datasetDoi} to get citation.` })
        }
        const dataset = myDataResponse.data.data.items[0]
        const citationHtml = dataset.citationHtml
        const doiUrl = dataset.url
        const isDraftState = dataset.is_draft_state

        const annotation = titleAnnResponse.data
        annotation.target.forEach((element: any) => {
          element.source = destinationUrl
        })
        let newReadPermission = [hypothesisUserId]
        if (!privateAnnotation) {
          newReadPermission = [`group:${destinationHypothesisGroup}`]
        }
        await axiosClient.post(
          `${process.env.HYPOTHESIS_SERVER_URL}/api/annotations`,
          JSON.stringify({
            uri: destinationUrl,
            document: annotation.document,
            text: createInitialAnnotationText(citationHtml, doiUrl, isDraftState),
            //tags
            group: destinationHypothesisGroup,
            //other permissions' type default to only the user
            permissions: { read: newReadPermission },
            target: annotation.target,
          }),
          {
            headers: {
              Authorization: `Bearer ${hypothesisApiToken}`,
              "Content-Type": "application/json",
              [REQUEST_DESC_HEADER_NAME]: `Sending title annotation from source manuscript ${manuscriptId} to Hypothes.is server`,
            },
          }
        )
        res.status(200).json({ message: "Added ATI annotation to title." })
      } catch (e) {
        const { status, message } = getResponseFromError(e, requestDesc)
        console.error(status, message)
        res.status(status).json({ message })
      }
    } else {
      res.status(401).json({ message: "Unauthorized! Please login." })
    }
  } else {
    res.status(405).json({ message: `${req.method} method is not allowed.` })
  }
}
