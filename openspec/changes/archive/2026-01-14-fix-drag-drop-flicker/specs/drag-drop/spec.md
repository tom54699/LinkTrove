## ADDED Requirements

### Requirement: Card Drop Timing
The system SHALL wait for the drop operation to complete before clearing the ghost preview state, ensuring smooth visual transition without flicker.

#### Scenario: Drop existing card to new position
- **WHEN** user drops a card to a new position
- **THEN** the ghost preview remains visible until the data update completes
- **AND** the ghost is cleared only after the card appears in its new position

#### Scenario: Drop operation fails
- **WHEN** user drops a card and the operation fails
- **THEN** the ghost preview is still cleared (via try-finally)
- **AND** an error message is shown to the user
