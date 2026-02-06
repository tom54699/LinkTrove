## MODIFIED Requirements

### Requirement: Card Drop Timing
The system SHALL clear the ghost preview state immediately after calculating the drop position (beforeId), before executing any asynchronous operations. This ensures smooth visual transition without blocking the UI on background tasks like meta enrichment.

#### Scenario: Drop tab to create new card (with close-tab-after-save enabled)
- **GIVEN** user has "close tab after save" setting enabled
- **WHEN** user drops a tab from Open Tabs panel to create a new card
- **THEN** the ghost preview is cleared immediately after drop position is calculated
- **AND** the card creation and meta enrichment execute in background
- **AND** the tab is closed after meta enrichment completes (if enabled)
- **AND** the user does not see the ghost lingering while waiting for meta

#### Scenario: Drop existing card to new position
- **WHEN** user drops an existing card to a new position
- **THEN** the ghost preview is cleared immediately after drop position is calculated
- **AND** the card move operation executes in background
- **AND** the card appears in its new position without ghost flickering

#### Scenario: Drop operation fails
- **WHEN** user drops a card/tab and the operation fails
- **THEN** the ghost preview is already cleared (cleaned before async operation)
- **AND** an error message is shown to the user via toast
