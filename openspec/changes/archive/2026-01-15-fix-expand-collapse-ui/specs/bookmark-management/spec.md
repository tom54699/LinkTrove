## MODIFIED Requirements

### Requirement: Collection View Management
The system SHALL allow users to manage the view of collections and groups.

#### Scenario: Collapse All Groups
- **GIVEN** a collection with multiple expanded groups
- **WHEN** the user clicks the "Collapse All" button
- **THEN** all groups in the current collection SHALL collapse (hide cards)
- **THEN** the state SHALL be persisted

#### Scenario: Expand All Groups
- **GIVEN** a collection with multiple collapsed groups
- **WHEN** the user clicks the "Expand All" button
- **THEN** all groups in the current collection SHALL expand (show cards)
- **THEN** the state SHALL be persisted