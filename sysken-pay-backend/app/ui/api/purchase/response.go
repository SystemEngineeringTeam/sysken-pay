package purchase

import (
	"sysken-pay-api/app/domain/object/purchase"
)

type PostPurchaseResponse struct {
	Status  string `json:"status"`
	Balance int    `json:"balance"`
	UserID  string `json:"user_id"`
	Items   []struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
}

func toPostPurchaseResponse(p *purchase.Purchase) *PostPurchaseResponse {
	items := make([]struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}, len(p.Items()))

	for i, item := range p.Items() {
		items[i].ItemID = item.ItemID()
		items[i].Quantity = item.Quantity()
	}

	return &PostPurchaseResponse{
		Status:  "success",
		Balance: p.Balance(),
		UserID:  p.UserID(),
		Items:   items,
	}
}

type PostPurchaseCancelResponse struct {
	Status string `json:"status"`
	ID     int    `json:"id"`
	UserID string `json:"user_id"`
	Items  []struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
	CreatedAt string `json:"created_at"`
}

func toPostPurchaseCancelResponse(p *purchase.Purchase) *PostPurchaseCancelResponse {
	items := make([]struct {
		ItemID   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}, len(p.Items()))

	for i, item := range p.Items() {
		items[i].ItemID = item.ItemID()
		items[i].Quantity = item.Quantity()
	}

	return &PostPurchaseCancelResponse{
		Status:    "success",
		ID:        p.ID(),
		UserID:    p.UserID(),
		Items:     items,
		CreatedAt: p.CreatedAt().Format("2006-01-02T15:04:05.000Z"),
	}
}
