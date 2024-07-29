import { Dispatch, useEffect, useReducer } from "react"

import qs from "qs"

import { axiosClient } from "../../app"

import {
  ISearchDatasetAction,
  searchDatasetReducer,
  ISearchDatasetState,
  SearchDatasetActionType,
} from "./state"

import { getMessageFromError } from "../../../utils/httpRequestUtils"
import { PUBLICATION_STATUSES } from "../../../constants/dataverse"
import { IMyDataSearch } from "../../../types/api"

const useSearchDataset = (
  inititalState: ISearchDatasetState
): [ISearchDatasetState, Dispatch<ISearchDatasetAction>] => {
  const [state, dispatch] = useReducer(searchDatasetReducer, inititalState)

  useEffect(() => {
    let didCancel = false

    const search = async () => {
      try {
        dispatch({ type: SearchDatasetActionType.SEARCH_INIT })
        const { data } = await axiosClient.get<IMyDataSearch>(`/api/mydata-search`, {
          params: {
            q: state.q,
            //dataverse mydata selected_page starts at 1
            selectedPage: state.fetchPage ? state.page + 1 : 1,
            isAnnoRep: false,
            publicationStatuses: PUBLICATION_STATUSES,
          },
          paramsSerializer: {
            serialize: (params) => {
              return qs.stringify(params, { indices: false })
            },
          },
        })
        if (!didCancel) {
          const actionType = state.fetchPage
            ? SearchDatasetActionType.SEARCH_PAGE
            : SearchDatasetActionType.SEARCH_Q
          dispatch({ type: actionType, payload: data })
        }
      } catch (e) {
        if (!didCancel) {
          const message = getMessageFromError(e)
          dispatch({ type: SearchDatasetActionType.SEARCH_FAILURE, payload: message })
          if (state.fetchQ) {
            dispatch({ type: SearchDatasetActionType.NO_RESULTS })
          }
        }
      }
    }

    if (state.fetchPage || state.fetchQ) {
      search()
    }

    return () => {
      didCancel = true
    }
  }, [state.q, state.fetchQ, state.page, state.fetchPage])

  return [state, dispatch]
}

export default useSearchDataset
