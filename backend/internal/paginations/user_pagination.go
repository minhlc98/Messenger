package paginations

import "time"

type UserPagination struct {
	Email       string     `form:"email" json:"email"`
	IsOnline    *bool      `form:"is_online" json:"is_online"`
	CreateAtGte *time.Time `form:"created_at_gte" json:"created_at_gte"`
	CreateAtLte *time.Time `form:"created_at_lte" json:"created_at_lte"`
	Order       string     `form:"order" json:"order" default:"created_at_desc"`
	Offset      int        `form:"offset" json:"offset" default:"0"`
	Limit       int        `form:"limit" json:"limit" default:"10"`
}

func newUserPagination() *UserPagination {
	return &UserPagination{}
}
