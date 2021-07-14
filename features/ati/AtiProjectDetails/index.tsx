import { FC } from "react"

import { Tabs, Tab } from "carbon-components-react"
import { IATIProjectDetails } from "../../../types/dataverse"
import AtiSummary from "../AtiSummary"
import AtiManuscript from "../AtiManuscript"
import AtiSettings from "../AtiSettings"

interface ATIProjectDetailsProps {
  serverUrl: string
  atiProjectDetails: IATIProjectDetails
}

const ATIProjectDetails: FC<ATIProjectDetailsProps> = ({ serverUrl, atiProjectDetails }) => {
  return (
    <>
      <h1>{atiProjectDetails.dataset.title}</h1>
      <Tabs>
        <Tab id="summary" label="Summary">
          <AtiSummary serverUrl={serverUrl} atiProjectDetails={atiProjectDetails} />
        </Tab>
        <Tab id="manuscript" label="Manuscript">
          <AtiManuscript
            datasetId={atiProjectDetails.dataset.id}
            doi={atiProjectDetails.dataset.doi}
            manuscriptId={atiProjectDetails.manuscript.id}
            datasources={atiProjectDetails.datasources}
            serverUrl={serverUrl}
          />
        </Tab>
        <Tab id="settings" label="Settings">
          <AtiSettings
            dataset={atiProjectDetails.dataset}
            manuscriptId={atiProjectDetails.manuscript.id}
          />
        </Tab>
      </Tabs>
    </>
  )
}

export default ATIProjectDetails
