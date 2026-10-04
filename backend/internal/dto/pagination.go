package dto

type CursorPaginationInfo struct {
	NextCursor *string `json:"next_cursor,omitempty"`
	Limit      int     `json:"limit"`
}

type CursorBaseResponse[T any] struct {
	Data       T                    `json:"data"`
	Pagination CursorPaginationInfo `json:"pagination"`
}
