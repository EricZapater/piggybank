package couples

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusPending  = "pending"
	StatusAccepted = "accepted"
	StatusRejected = "rejected"
)

// Couple represents a committed pair of partners.
type Couple struct {
	ID             uuid.UUID
	Partner1UserID uuid.UUID
	Partner2UserID uuid.UUID
	CreatedAt      time.Time
}

// CoupleRequest captures the invitation workflow between two partners.
type CoupleRequest struct {
	ID              uuid.UUID
	RequesterUserID uuid.UUID
	TargetUserID    uuid.UUID
	Status          string
	CreatedAt       time.Time
	RespondedAt     *time.Time
}

// Direction indicates whether a request is incoming or outgoing relative to a user.
type Direction string

const (
	DirectionIncoming Direction = "incoming"
	DirectionOutgoing Direction = "outgoing"
)

// RequestView is the shape consumed by upper layers to present request data.
type RequestView struct {
	Request   CoupleRequest
	PartnerID uuid.UUID
	Direction Direction
}

// CoupleView summarizes the couple for a user along with the partner identifier.
type CoupleView struct {
	Couple    Couple
	PartnerID uuid.UUID
}

// StatusView aggregates the couple and outstanding requests for a user.
type StatusView struct {
	Couple   *CoupleView
	Incoming []RequestView
	Outgoing []RequestView
}
