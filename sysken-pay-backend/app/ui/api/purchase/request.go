package purchase

type PostPurchaseRequest struct {
	Items []struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
}

type PostPurchaseCancelRequest struct {
	Items []struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
}
