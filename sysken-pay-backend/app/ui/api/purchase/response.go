package purchase

import (
	"sysken-pay-api/app/domain/object/purchase"
)

type PostPurchaseResponse struct {
	Status  string `json:"status"`
	Balance int    `json:"balance"`
	UserId  string `json:"user_id"`
	Items   []struct {
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
}

func toPostPurchaseResponse(p *purchase.Purchase) *PostPurchaseResponse {
	items := make([]struct {
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}, len(p.Items()))

	for i, item := range p.Items() {
		items[i].ItemId = item.ItemID()
		items[i].Quantity = item.Quantity()
	}

	return &PostPurchaseResponse{
		Status:  "success",
		Balance: p.Balance(),
		UserId:  p.UserID(),
		Items:   items,
	}
}

type PostPurchaseCancelResponse struct {
	Status string `json:"status"`
	Id     int    `json:"id"`
	UserId string `json:"user_id"`
	Items  []struct {
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	} `json:"items"`
	CreatedAt string `json:"created_at"`
}

func toPostPurchaseCancelResponse(p *purchase.Purchase) *PostPurchaseCancelResponse {
	items := make([]struct {
		ItemId   int `json:"item_id"`
		Quantity int `json:"quantity"`
	}, len(p.Items()))

	for i, item := range p.Items() {
		items[i].ItemId = item.ItemID()
		items[i].Quantity = item.Quantity()
	}

	return &PostPurchaseCancelResponse{
		Status:    "success",
		Id:        p.ID(),
		UserId:    p.UserID(),
		Items:     items,
		CreatedAt: p.CreatedAt().Format("2006-01-02T15:04:05.000Z"),
	}
}
