import { Dispatch, useEffect, useReducer } from "react"

import qs from "qs"

import { axiosClient } from "../../app"

import { SearchActionType, ISearchAction, searchReducer, ISearchState } from "./state"
import { getTrueFields } from "./utils"

import { PUBLICATION_STATUSES } from "../../../constants/dataverse"
import { getMessageFromError } from "../../../utils/httpRequestUtils"
import { IMyDataSearch } from "../../../types/api"

const useSearch = (inititalState: ISearchState): [ISearchState, Dispatch<ISearchAction>] => {
  const [state, dispatch] = useReducer(searchReducer, inititalState)

  useEffect(() => {
    let didCancel = false

    const search = async () => {
      try {
        dispatch({ type: SearchActionType.SEARCH_INIT })
        //if search q use all the publication statuses, else use the selected publication statuses
        const publicationStatuses = state.fetchQ
          ? PUBLICATION_STATUSES
          : getTrueFields(state.selectedPublicationStatuses)
        const { data } = await axiosClient.get<IMyDataSearch>(`/api/mydata-search`, {
          params: {
            publicationStatuses,
            q: state.q,
            //dataverse mydata selected_page starts at 1
            //if search page then use state.page, else start at the beginning
            selectedPage: state.fetchPage ? state.page + 1 : 1,
            isAnnoRep: true,
          },
          paramsSerializer: {
            serialize: (params) => {
              return qs.stringify(params, { indices: false })
            },
          },
        })
        if (!didCancel) {
          const actionType = state.fetchPage
            ? SearchActionType.SEARCH_PAGE
            : SearchActionType.SEARCH_Q
          dispatch({ type: actionType, payload: data })
        }
      } catch (e) {
        if (!didCancel) {
          const message = getMessageFromError(e)
          dispatch({ type: SearchActionType.SEARCH_FAILURE, payload: message })
          dispatch({ type: SearchActionType.NO_RESULTS })
        }
      }
    }

    if (state.fetchPage || state.fetchQ || state.fetchPublicationStatus) {
      search()
    }

    return () => {
      didCancel = true
    }
  }, [
    state.q,
    state.fetchQ,
    state.page,
    state.fetchPage,
    state.selectedPublicationStatuses,
    state.fetchPublicationStatus,
  ])

  return [state, dispatch]
}

export default useSearch
