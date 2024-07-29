import { FC } from "react"

import { InlineNotification, NotificationActionButton } from "carbon-components-react"
import { GetServerSideProps } from "next"
import { getSession } from "next-auth/client"
import { useRouter } from "next/router"
import qs from "qs"

import { axiosClient } from "../features/app"

import AtiProjects from "../features/ati/AtiProjects"
import AppGuide from "../features/components/AppGuide"
import HomePageTitle from "../features/components/HomePageTitle"
import Layout from "../features/components/Layout"

import { REQUEST_DESC_HEADER_NAME } from "../constants/http"
import { IAtiProject } from "../types/ati"
import { getResponseFromError } from "../utils/httpRequestUtils"

import {
  ANNOREP_METADATA_VALUE,
  DATASET_DV_TYPE,
  KIND_OF_DATA_NAME,
  PUBLICATION_STATUSES,
  ROLE_IDS,
} from "../constants/dataverse"
import { IAnnoRepUser } from "../types/auth"
import { getAnnoRepUser } from "../utils/authUtils"

import styles from "../styles/Home.module.css"

interface HomeProps {
  user: IAnnoRepUser | null
  atiProjects: IAtiProject[]
  totalCount: number
  atisPerPage?: number
  publicationStatusCount?: any
  selectedFilters?: any
  errorMsg?: string
}
const Home: FC<HomeProps> = ({
  user,
  atiProjects,
  totalCount,
  errorMsg,
  atisPerPage,
  publicationStatusCount,
  selectedFilters,
}) => {
  const router = useRouter()
  return (
    <Layout user={user} title="AnnoREP - Home">
      <>
        {user ? (
          <div className={styles.container}>
            <HomePageTitle />
            {totalCount === 0 || errorMsg ? (
              <InlineNotification
                hideCloseButton
                lowContrast
                kind={errorMsg ? "error" : "info"}
                title={errorMsg ? errorMsg : "You have no ATI projects."}
                actions={
                  <NotificationActionButton onClick={() => router.push("/new")}>
                    Create new
                  </NotificationActionButton>
                }
              />
            ) : (
              <AtiProjects
                atiProjects={atiProjects}
                initialTotalCount={totalCount}
                atisPerPage={atisPerPage as number}
                publicationStatusCount={publicationStatusCount}
                selectedFilters={selectedFilters}
              />
            )}
          </div>
        ) : (
          <AppGuide isLoggedIn={user ? true : false} />
        )}
      </>
    </Layout>
  )
}

export default Home

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  const props: HomeProps = {
    user: getAnnoRepUser(session, process.env.DATAVERSE_SERVER_URL),
    atiProjects: [],
    totalCount: 0,
  }
  if (session) {
    try {
      const { data } = await axiosClient.get(
        `${process.env.DATAVERSE_SERVER_URL}/api/mydata/retrieve`,
        {
          params: {
            key: session.dataverseApiToken,
            dvobject_types: DATASET_DV_TYPE,
            published_states: PUBLICATION_STATUSES,
            mydata_search_term: `${KIND_OF_DATA_NAME}:${ANNOREP_METADATA_VALUE}`,
            role_ids: ROLE_IDS,
          },
          paramsSerializer: {
            serialize: (params) => {
              return qs.stringify(params, { indices: false })
            },
          },
          headers: {
            [REQUEST_DESC_HEADER_NAME]: `Searching for ${ANNOREP_METADATA_VALUE} data projects`,
          },
        }
      )
      if (data.success) {
        const items = data.data.items
        for (let i = 0; i < items.length; i++) {
          props.atiProjects.push({
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
        props.totalCount = data.data.total_count
        props.atisPerPage = data.data.pagination.docsPerPage
        props.publicationStatusCount = data.data.pubstatus_counts
        props.selectedFilters = data.data.selected_filters
      }
    } catch (e) {
      const { message } = getResponseFromError(e)
      props.errorMsg = message
    }
  }
  return {
    props: props,
  }
}
