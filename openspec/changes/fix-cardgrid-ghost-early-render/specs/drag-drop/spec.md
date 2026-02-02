## ADDED Requirements
### Requirement: Card Ghost Render Readiness
The system SHALL render card-drag ghost preview only after drag source identity and insertion position are both ready.

#### Scenario: Drag start immediately records dragged card identity
- **WHEN** user starts dragging a saved card
- **THEN** the system immediately records the dragged card id in drag state
- **AND** the dragged card can be filtered from the preview list without waiting for first `dragover`

#### Scenario: Drag start does not disable drag source
- **WHEN** user starts dragging a saved card
- **THEN** the drag source remains interactive (no `pointer-events: none`) so the drag is not cancelled
- **AND** ghost activation is deferred until `dragover` in a drop zone

#### Scenario: Card ghost waits for ready state
- **GIVEN** a card drag is in progress
- **WHEN** ghost signals are active but either dragged card id or ghost index is not ready
- **THEN** the system does not render card ghost yet
- **AND** once both values are ready, the ghost renders at computed index without duplicate real-card flash

#### Scenario: Tab drag behavior remains unchanged
- **WHEN** user drags a browser tab into group area
- **THEN** tab ghost preview continues to render using existing tab drag signals
- **AND** tab drop flow remains unaffected
