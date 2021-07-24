import { FC, FormEventHandler, useState } from "react"

import axios from "axios"
import {
  Button,
  Form,
  FileUploader,
  Link,
  Loading,
  InlineNotification,
  Modal,
  CopyButton,
} from "carbon-components-react"
import FormData from "form-data"
import { CopyToClipboard } from "react-copy-to-clipboard"
import { Popup16, TrashCan16, Upload16 } from "@carbon/icons-react"
import { useRouter } from "next/router"

import { IDatasource } from "../../../types/dataverse"
import { getMessageFromError } from "../../../utils/httpRequestUtils"

import styles from "./AtiManuscript.module.css"

interface AtiManuscriptProps {
  datasetId: string
  doi: string
  datasources: IDatasource[]
  serverUrl: string
  manuscriptId?: string
}

const AtiManuscript: FC<AtiManuscriptProps> = ({
  datasetId,
  doi,
  manuscriptId,
  datasources,
  serverUrl,
}) => {
  const router = useRouter()
  const [modalIsOpen, setModalIsopen] = useState<boolean>(false)
  const openModal = () => setModalIsopen(true)
  const closeModal = () => setModalIsopen(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string>("")

  const onDelete: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const id = manuscriptId as string
    setIsLoading(true)
    setErrorMsg("")
    await axios
      .delete(`/api/delete-file/${id}`)
      .then(() => {
        setIsLoading(false)
        router.reload()
      })
      .catch((error) => {
        setIsLoading(false)
        setErrorMsg(`${getMessageFromError(error)}`)
      })
  }

  const onUpload: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    const target = e.target as typeof e.target & {
      manuscript: { files: FileList }
    }
    const formData = new FormData()
    formData.append("manuscript", target.manuscript.files[0])
    setIsLoading(true)
    setErrorMsg("")
    await axios({
      method: "POST",
      url: `/api/datasets/${datasetId}/manuscript`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
      .then(({ data }) => {
        const newManuscriptId = data.files[0].dataFile.id
        return axios({
          method: "PUT",
          url: `/api/arcore/${newManuscriptId}`,
        })
      })
      .then(() => {
        setIsLoading(false)
        router.reload()
      })
      .catch((error) => {
        setIsLoading(false)
        setErrorMsg(`${getMessageFromError(error)}`)
      })
  }

  return (
    <>
      {isLoading && <Loading description="Uploading manuscript" />}
      <div className={styles.container}>
        <Button kind="ghost" size="md" renderIcon={Popup16} onClick={openModal}>
          Datasources
        </Button>
        <Form encType="multipart/form-data" onSubmit={manuscriptId ? onDelete : onUpload}>
          {errorMsg && (
            <div className="ar--form-item">
              <InlineNotification
                hideCloseButton
                kind="error"
                subtitle={<span>{errorMsg}</span>}
                title="Error"
              />
            </div>
          )}
          {manuscriptId ? (
            <Button type="submit" kind="danger" size="sm" renderIcon={TrashCan16}>
              Delete manuscript
            </Button>
          ) : (
            <>
              <div className="ar--form-item">
                <FileUploader
                  aria-required={true}
                  accept={[".docx, .pdf"]}
                  buttonKind="tertiary"
                  buttonLabel="Add file"
                  filenameStatus="edit"
                  iconDescription="Clear file"
                  labelDescription="Supported file types are .docx and .pdf."
                  labelTitle="Upload manuscript"
                  name="manuscript"
                  size="small"
                />
              </div>
              <Button type="submit" kind="tertiary" size="sm" renderIcon={Upload16}>
                Upload manuscript
              </Button>
            </>
          )}
        </Form>
      </div>
      <Modal
        className="ar--datasource-modal"
        aria-label="Datasources"
        open={modalIsOpen}
        modalLabel="Datasources"
        modalHeading="Copy datasource URL"
        passiveModal={true}
        size="xs"
        hasScrollingContent={true}
        preventCloseOnClickOutside={true}
        onRequestClose={closeModal}
      >
        <Link
          href={`${serverUrl}/dataset.xhtml?persistentId=${doi}`}
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
        >
          Modify datasources
        </Link>
        {datasources.length === 0 && (
          <div className={styles.infotext}>No datasources found for this project.</div>
        )}
        {datasources.map(({ id, name, uri }) => (
          <div key={id} className={styles.datasource}>
            <Link target="_blank" rel="noopener noreferrer" size="lg" href={uri}>
              {name}
            </Link>
            <CopyToClipboard key={id} text={uri}>
              <CopyButton
                feedback="Copied!"
                feedbackTimeout={3000}
                iconDescription="Copy URL to clipboard"
              />
            </CopyToClipboard>
          </div>
        ))}
      </Modal>
      {manuscriptId && (
        <iframe
          className={styles.iframe}
          id={`manuscript__${manuscriptId}`}
          title="manuscript"
          src={`/manuscript/${manuscriptId}`}
          width="100%"
        />
      )}
    </>
  )
}

export default AtiManuscript
