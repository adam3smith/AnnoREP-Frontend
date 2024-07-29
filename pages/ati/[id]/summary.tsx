import { FC } from "react"

import { AxiosResponse } from "axios"
import { GetServerSideProps } from "next"
import { getSession } from "next-auth/client"
import qs from "qs"

import { axiosClient } from "../../../features/app"

import AtiSummary from "../../../features/ati/AtiSummary"
import AtiTab from "../../../features/ati/AtiTab"

import { AtiTab as AtiTabConstant } from "../../../constants/ati"
import {
  DATASET_DV_TYPE,
  DATAVERSE_HEADER_NAME,
  PUBLICATION_STATUSES,
} from "../../../constants/dataverse"
import { REQUEST_DESC_HEADER_NAME } from "../../../constants/http"
import { IAnnoRepUser } from "../../../types/auth"
import { IATIProjectDetails } from "../../../types/dataverse"
import { getAnnoRepUser } from "../../../utils/authUtils"
import { createAtiProjectDetails } from "../../../utils/dataverseUtils"
import { getResponseFromError } from "../../../utils/httpRequestUtils"

interface AtiPageProps {
  user: IAnnoRepUser | null
  serverUrl: string
  atiProjectDetails: IATIProjectDetails | null
  appUrl: string
  hypthesisAtiStagingGroupId: string
}

const AtiPage: FC<AtiPageProps> = ({
  user,
  serverUrl,
  atiProjectDetails,
  appUrl,
  hypthesisAtiStagingGroupId,
}) => {
  return (
    <AtiTab
      user={user}
      dataset={atiProjectDetails ? atiProjectDetails.dataset : null}
      selectedTab={AtiTabConstant.summary.id}
    >
      {atiProjectDetails && (
        <AtiSummary
          serverUrl={serverUrl}
          atiProjectDetails={atiProjectDetails}
          appUrl={appUrl}
          hypothesisAtiStagingGroupId={hypthesisAtiStagingGroupId}
        />
      )}
    </AtiTab>
  )
}

export default AtiPage

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  const props: AtiPageProps = {
    user: getAnnoRepUser(session, process.env.DATAVERSE_SERVER_URL),
    atiProjectDetails: null,
    serverUrl: process.env.DATAVERSE_SERVER_URL as string,
    appUrl: process.env.NEXTAUTH_URL as string,
    hypthesisAtiStagingGroupId: process.env.HYPOTHESIS_ATI_STAGING_GROUP_ID as string,
  }
  const datasetId = context?.params?.id

  const responses: AxiosResponse<any>[] = []
  let citationHtml = ""
  let publicationStatuses: string[] = []

  if (session) {
    const { dataverseApiToken } = session
    //Get the dataset json
    await axiosClient
      .get(`${process.env.DATAVERSE_SERVER_URL}/api/datasets/${datasetId}`, {
        headers: {
          [DATAVERSE_HEADER_NAME]: dataverseApiToken as string,
          [REQUEST_DESC_HEADER_NAME]: `Getting JSON for data project ${datasetId}`,
          Accept: "application/json",
        },
      })
      .then((datasetJsonResponse) => {
        responses.push(datasetJsonResponse)
        const dsPersistentId = datasetJsonResponse.data.data.latestVersion.datasetPersistentId
        return axiosClient.get(`${process.env.DATAVERSE_SERVER_URL}/api/mydata/retrieve`, {
          params: {
            key: dataverseApiToken,
            dvobject_types: DATASET_DV_TYPE,
            published_states: PUBLICATION_STATUSES,
            mydata_search_term: `"${dsPersistentId}"`,
          },
          paramsSerializer: {
            serialize: (params) => {
              return qs.stringify(params, { indices: false })
            },
          },
          headers: {
            [REQUEST_DESC_HEADER_NAME]: `Searching for data project ${dsPersistentId}`,
          },
        })
      })
      .then((myDataResponse) => {
        if (myDataResponse.data.success && myDataResponse.data.data.items.length > 0) {
          const dataset = myDataResponse.data.data.items[0]
          citationHtml = dataset.citationHtml
          publicationStatuses = dataset.publication_statuses
        }
      })
      .catch((e) => {
        const { status, message } = getResponseFromError(e)
        console.error(status, message)
      })
    if (responses.length === 1) {
      props.atiProjectDetails = createAtiProjectDetails(responses[0], "")
      if (citationHtml) {
        props.atiProjectDetails.dataset.citationHtml = citationHtml
      }
      if (publicationStatuses) {
        props.atiProjectDetails.dataset.publicationStatuses = publicationStatuses
      }
    }
  }

  return {
    props: props,
  }
}
