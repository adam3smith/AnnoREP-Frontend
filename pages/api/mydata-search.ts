import { NextApiRequest, NextApiResponse } from "next"
import { getSession } from "next-auth/client"
import qs from "qs"

import { axiosClient } from "../../features/app"

import {
  ANNOREP_METADATA_VALUE,
  DATASET_DV_TYPE,
  KIND_OF_DATA_NAME,
  ROLE_IDS,
} from "../../constants/dataverse"
import { REQUEST_DESC_HEADER_NAME } from "../../constants/http"
import { IAtiProject } from "../../types/ati"
import { getResponseFromError } from "../../utils/httpRequestUtils"

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "GET") {
    const session = await getSession({ req })
    if (session) {
      const { dataverseApiToken } = session
      const { selectedPage, q, isAnnoRep, publicationStatuses } = req.query
      let searchTerm = `${KIND_OF_DATA_NAME}:${ANNOREP_METADATA_VALUE}`
      const searchForAnnoRep = isAnnoRep === "true"
      if (!searchForAnnoRep) {
        searchTerm = "-" + searchTerm
      }
      if (q) {
        searchTerm = searchTerm + ` AND ${q}`
      }
      try {
        const { data } = await axiosClient.get(
          `${process.env.DATAVERSE_SERVER_URL}/api/mydata/retrieve`,
          {
            params: {
              key: dataverseApiToken,
              dvobject_types: DATASET_DV_TYPE,
              published_states: publicationStatuses,
              mydata_search_term: searchTerm,
              selected_page: selectedPage || 1,
              role_ids: ROLE_IDS,
            },
            paramsSerializer: {
              serialize: (params) => {
                return qs.stringify(params, { indices: false })
              },
            },
            headers: {
              [REQUEST_DESC_HEADER_NAME]: `Searching for ${
                searchForAnnoRep ? ANNOREP_METADATA_VALUE : ""
              } data projects`,
            },
          }
        )
        if (data.success) {
          const datasets: IAtiProject[] = []
          const items = data.data.items
          for (let i = 0; i < items.length; i++) {
            datasets.push({
              id: items[i].entity_id,
              name: items[i].name,
              description: items[i].description,
              citationHtml: items[i].citationHtml,
              dataverseName: items[i].name_of_dataverse,
              publicationStatuses: items[i].publication_statuses,
              dateDisplay: items[i].date_to_display_on_card,
              userRoles: items[i].user_roles,
              dataverseServerUrl: process.env.DATAVERSE_SERVER_URL as string,
              dataverse: items[i].identifier_of_dataverse,
            })
          }
          res.status(200).json({
            datasets,
            totalCount: data.data.total_count,
            //0th index, this is used for changeing pages
            start: data.data.start,
            docsPerPage: data.data.pagination.docsPerPage,
            publicationStatusCount: data.data.pubstatus_counts,
            selectedFilters: data.data.selected_filters,
          })
        } else {
          res.status(400).json({
            message: data.error_message,
          })
        }
      } catch (e) {
        const { status, message } = getResponseFromError(e)
        res.status(status).json({ message })
      }
    } else {
      res.status(401).json({ message: "Unauthorized. Please login. " })
    }
  } else {
    res.status(405).json({ message: `${req.method} method is not allowed.` })
  }
}
