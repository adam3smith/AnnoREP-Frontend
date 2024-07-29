import { FC } from "react"

import { InlineNotification } from "carbon-components-react"
import { getSession } from "next-auth/client"
import { GetServerSideProps } from "next"
import qs from "qs"

import { axiosClient } from "../../features/app"

import NewAtiProjectForm from "../../features/ati/NewAtiProjectForm"
import Layout from "../../features/components/Layout"

import {
  ANNOREP_METADATA_VALUE,
  DATASET_DV_TYPE,
  KIND_OF_DATA_NAME,
  PUBLICATION_STATUSES,
  ROLE_IDS,
} from "../../constants/dataverse"
import { REQUEST_DESC_HEADER_NAME } from "../../constants/http"
import { IAnnoRepUser } from "../../types/auth"
import { IDatasetOption } from "../../types/dataverse"
import { getAnnoRepUser } from "../../utils/authUtils"
import { getResponseFromError } from "../../utils/httpRequestUtils"

interface NewAtiProps {
  user: IAnnoRepUser | null
  datasets: IDatasetOption[]
  serverUrl: string
  totalCount: number
  datasetsPerPage?: number
}

const NewAti: FC<NewAtiProps> = ({ user, datasets, serverUrl, totalCount, datasetsPerPage }) => {
  return (
    <Layout user={user} title="AnnoREP - New ATI Project">
      {user ? (
        <NewAtiProjectForm
          datasets={datasets}
          serverUrl={serverUrl}
          initialTotalCount={totalCount}
          datasetsPerPage={datasetsPerPage}
        />
      ) : (
        <InlineNotification
          hideCloseButton
          lowContrast
          kind="info"
          subtitle={<span>{"Please login to create a new ATI project."}</span>}
          title="Unauthorized!"
        />
      )}
    </Layout>
  )
}

export default NewAti

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  const props: NewAtiProps = {
    user: getAnnoRepUser(session, process.env.DATAVERSE_SERVER_URL),
    datasets: [],
    totalCount: 0,
    serverUrl: process.env.DATAVERSE_SERVER_URL as string,
  }
  if (session) {
    try {
      const { data } = await axiosClient.get(
        //TODO: change to X-Dataverse-key header later
        `${process.env.DATAVERSE_SERVER_URL}/api/mydata/retrieve`,
        {
          params: {
            key: session.dataverseApiToken,
            dvobject_types: DATASET_DV_TYPE,
            published_states: PUBLICATION_STATUSES,
            mydata_search_term: `-${KIND_OF_DATA_NAME}:${ANNOREP_METADATA_VALUE}`,
            role_ids: ROLE_IDS,
          },
          paramsSerializer: {
            serialize: (params) => {
              return qs.stringify(params, { indices: false })
            },
          },
          headers: {
            [REQUEST_DESC_HEADER_NAME]: `Searching for non ${ANNOREP_METADATA_VALUE} data projects`,
          },
        }
      )
      if (data.success) {
        const items = data.data.items
        for (let i = 0; i < items.length; i++) {
          props.datasets.push({
            id: items[i].entity_id,
            name: items[i].name,
          })
        }
        props.totalCount = data.data.total_count
        props.datasetsPerPage = data.data.pagination.docsPerPage
      }
    } catch (e) {
      //failed to get datasets, but still proceed to new ati form
      const { status, message } = getResponseFromError(e)
      console.warn(status, message)
    }
  }
  return {
    props: props,
  }
}
