# Card Editing Specification

## ADDED Requirements

### Requirement: Meta Field Merge Strategy
When saving card edits, the system SHALL preserve meta fields that were populated by meta enrichment and not edited by the user.

#### Scenario: User edits title only, meta enrichment has populated other fields
- **GIVEN** a newly created card with empty fields
- **AND** meta enrichment is running in background
- **WHEN** user opens edit modal immediately and edits title field
- **AND** meta enrichment completes and populates `meta.author`, `meta.genre`
- **AND** user clicks Done button
- **THEN** the saved card SHALL have:
  - Updated `title` from user edit
  - Preserved `meta.author` and `meta.genre` from meta enrichment
  - Not overwritten with empty values

#### Scenario: User edits meta field, merge with enrichment data
- **GIVEN** a card with `meta = { author: "A", genre: "G" }` from enrichment
- **WHEN** user opens edit modal and changes `author` to "B"
- **AND** clicks Done button
- **THEN** the saved card SHALL have `meta = { author: "B", genre: "G" }`

### Requirement: Edit Modal Save Triggers
The system SHALL only save card edits when user explicitly triggers save action.

#### Scenario: Done button saves changes
- **GIVEN** user has opened edit modal and modified fields
- **WHEN** user clicks Done button
- **THEN** all changes SHALL be saved to database
- **AND** modal SHALL close

#### Scenario: Enter key saves changes
- **GIVEN** user has opened edit modal and is editing any input field
- **WHEN** user presses Enter key
- **THEN** all changes SHALL be saved to database
- **AND** modal SHALL close

#### Scenario: Cancel button discards changes
- **GIVEN** user has opened edit modal and modified fields
- **WHEN** user clicks Cancel button
- **THEN** no changes SHALL be saved
- **AND** modal SHALL close

#### Scenario: Escape key discards changes
- **GIVEN** user has opened edit modal and modified fields
- **WHEN** user presses Escape key
- **THEN** no changes SHALL be saved
- **AND** modal SHALL close

#### Scenario: Clicking outside discards changes
- **GIVEN** user has opened edit modal and modified fields
- **WHEN** user clicks on the background overlay
- **THEN** no changes SHALL be saved
- **AND** modal SHALL close

### Requirement: Description Field Edit Behavior
The system SHALL only allow description editing through the edit modal.

#### Scenario: Description is read-only on card
- **GIVEN** a card is displayed in the grid
- **WHEN** user clicks on the card body
- **THEN** the card's URL SHALL open in a new tab
- **AND** no inline editing SHALL be triggered

#### Scenario: Description can be edited in modal
- **GIVEN** user has clicked Edit button and opened the modal
- **WHEN** user modifies the description field
- **AND** clicks Done button
- **THEN** the description SHALL be saved

## REMOVED Requirements

### Requirement: Description Inline Edit on Blur
**Reason**: Inline edit is not accessible due to card click triggering external link navigation. Users must use Edit button to open modal.
**Migration**: Remove `isEditing` state and onBlur save logic from WebpageCard component.
