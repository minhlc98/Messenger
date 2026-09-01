package dto

type WSMessageType struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversation_id"`
	SenderID       string `json:"sender_id"`
	Content        string `json:"content"`
	MessageType    string `json:"message_type"`
	FileURL        string `json:"file_url"`
}
