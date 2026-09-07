package dto

type EmailPayload struct {
	FromEmailAddress *string
	ToEmail          []string
	Subject          string
	Content          string
	CcEmail          []string
	BccEmail         []string
}
