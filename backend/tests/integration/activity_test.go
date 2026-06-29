//go:build integration

package integration

import (
	"net/http"
	"testing"
)

// TestActivity_CRUD tests the full lifecycle of activities (all 3 types).
func TestActivity_CRUD(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	if len(ctx.DayIDs) == 0 {
		t.Fatal("no day IDs available from trip creation")
	}

	dayID := ctx.DayIDs[0]
	var locationActivityID, noteActivityID, todoActivityID string

	t.Run("POST /days/:day_id/activities creates location activity", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":       "location",
			"title":      "Kuta Beach",
			"start_time": "08:00",
			"end_time":   "10:00",
			"payload": map[string]any{
				"location_name":   "Kuta Beach, Bali",
				"lat":             -8.7184,
				"lng":             115.1686,
				"google_place_id": "ChIJ123",
				"address":         "Kuta, Bali",
				"notes":           "Morning swim",
				"image_urls":      []string{"https://example.com/photo.jpg"},
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		locationActivityID = body["id"].(string)

		if body["type"] != "location" {
			t.Errorf("type = %q, want 'location'", body["type"])
		}
		if body["title"] != "Kuta Beach" {
			t.Errorf("title = %q, want 'Kuta Beach'", body["title"])
		}
		if body["order_index"] != float64(0) {
			t.Errorf("order_index = %v, want 0", body["order_index"])
		}
	})

	t.Run("POST /days/:day_id/activities creates note activity", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "note",
			"title": "Packing Reminder",
			"payload": map[string]any{
				"content": "Bring sunscreen, hat, and swimsuit",
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		noteActivityID = body["id"].(string)

		if body["type"] != "note" {
			t.Errorf("type = %q, want 'note'", body["type"])
		}
		if body["order_index"] != float64(1) {
			t.Errorf("order_index = %v, want 1", body["order_index"])
		}
	})

	t.Run("POST /days/:day_id/activities creates todo activity", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "todo",
			"title": "Checklist",
			"payload": map[string]any{
				"items": []map[string]any{
					{"id": "item-1", "text": "Book hotel", "completed": false},
					{"id": "item-2", "text": "Buy tickets", "completed": true},
				},
			},
		})
		assertStatus(t, resp, http.StatusCreated)

		body := parseMap(t, resp)
		todoActivityID = body["id"].(string)

		if body["type"] != "todo" {
			t.Errorf("type = %q, want 'todo'", body["type"])
		}
		if body["order_index"] != float64(2) {
			t.Errorf("order_index = %v, want 2", body["order_index"])
		}
	})

	t.Run("GET /days/:day_id/activities lists all activities in order", func(t *testing.T) {
		resp := apiGet(t, ctx, "/days/"+dayID+"/activities")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 3 {
			t.Fatalf("expected 3 activities, got %d", len(items))
		}

		// Verify order: location (0), note (1), todo (2)
		for i, item := range items {
			act := item.(map[string]any)
			expectedOrder := float64(i)
			if act["order_index"] != expectedOrder {
				t.Errorf("activity %d order_index = %v, want %v", i, act["order_index"], expectedOrder)
			}
		}
	})

	t.Run("PUT /activities/:id updates activity", func(t *testing.T) {
		if locationActivityID == "" {
			t.Fatal("no location activity ID")
		}

		resp := apiPut(t, ctx, "/activities/"+locationActivityID, map[string]any{
			"title":      "Seminyak Beach",
			"start_time": "09:00",
			"end_time":   "11:00",
			"payload": map[string]any{
				"location_name": "Seminyak Beach, Bali",
				"lat":           -8.6914,
				"lng":           115.1552,
				"notes":         "Changed from Kuta to Seminyak",
			},
		})
		assertStatus(t, resp, http.StatusOK)

		body := parseMap(t, resp)
		if body["title"] != "Seminyak Beach" {
			t.Errorf("title = %q, want 'Seminyak Beach'", body["title"])
		}
	})

	t.Run("PUT /days/:day_id/activities/reorder changes activity order", func(t *testing.T) {
		// Reverse order: todo, note, location
		resp := apiPut(t, ctx, "/days/"+dayID+"/activities/reorder", map[string]any{
			"ids": []string{todoActivityID, noteActivityID, locationActivityID},
		})
		assertStatus(t, resp, http.StatusNoContent)

		// Verify new order
		resp = apiGet(t, ctx, "/days/"+dayID+"/activities")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 3 {
			t.Fatalf("expected 3 activities after reorder, got %d", len(items))
		}

		// First should be todo (was last)
		first := items[0].(map[string]any)
		if first["id"] != todoActivityID {
			t.Errorf("first activity id = %q, want %q (todo)", first["id"], todoActivityID)
		}
	})

	t.Run("DELETE /activities/:id deletes activity", func(t *testing.T) {
		if noteActivityID == "" {
			t.Fatal("no note activity ID")
		}

		resp := apiDelete(t, ctx, "/activities/"+noteActivityID)
		assertStatus(t, resp, http.StatusNoContent)

		// Verify deletion
		resp = apiGet(t, ctx, "/days/"+dayID+"/activities")
		assertStatus(t, resp, http.StatusOK)

		items := parseList(t, resp)
		if len(items) != 2 {
			t.Errorf("expected 2 activities after delete, got %d", len(items))
		}
	})
}

// TestActivity_Validation tests activity validation errors.
func TestActivity_Validation(t *testing.T) {
	ctx := &TestContext{
		BaseURL:    globalCtx.BaseURL,
		Token:      globalCtx.Token,
		UserID:     globalCtx.UserID,
		HTTPClient: globalCtx.HTTPClient,
	}
	createTestTrip(t, ctx)
	defer deleteTestTrip(t, ctx)

	if len(ctx.DayIDs) == 0 {
		t.Fatal("no day IDs available")
	}
	dayID := ctx.DayIDs[0]

	t.Run("POST with invalid type returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "invalid_type",
			"title": "Test",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with empty title returns 400", func(t *testing.T) {
		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "note",
			"title": "",
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("POST with oversized payload returns 400", func(t *testing.T) {
		// Create a payload > 64KB
		largeContent := make([]byte, 70000)
		for i := range largeContent {
			largeContent[i] = 'a'
		}

		resp := apiPost(t, ctx, "/days/"+dayID+"/activities", map[string]any{
			"type":  "note",
			"title": "Large Note",
			"payload": map[string]any{
				"content": string(largeContent),
			},
		})
		assertStatus(t, resp, http.StatusBadRequest)
	})

	t.Run("DELETE nonexistent activity returns 404", func(t *testing.T) {
		resp := apiDelete(t, ctx, "/activities/00000000-0000-0000-0000-000000000000")
		assertStatus(t, resp, http.StatusNotFound)
	})
}
