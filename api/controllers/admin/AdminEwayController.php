<?php
declare(strict_types=1);

/**
 * Admin E-Way Bill Controller
 * GET /admin/eway-bills — List every invoice alongside its e-way bill status.
 *
 * One row per invoice (LEFT JOIN eway_bills, which is one-per-invoice). The e-way
 * bill itself is created/edited through the existing invoice endpoints
 * (GET/PUT /admin/invoices/{id}/eway-bill) — this controller is read-only and just
 * powers the standalone "E-Way Bills" list page.
 *
 * Column source of truth:
 *   invoices    → database/eco-sudar-test.sql  (invoice_id, invoice_number, invoice_date,
 *                 customer_name, status, total, created_at)
 *   eway_bills  → api/migrations/2026_08_17_eway_bill.sql  (eway_id, invoice_id, ewb_no,
 *                 ewb_date, valid_until, distance_km)
 *   users.name  → resolved via orders → users exactly like AdminInvoiceController::index.
 */
class AdminEwayController
{
    // ─── GET /admin/eway-bills ────────────────────────────────────────────────
    public function index(Request $request): void
    {
        $search = trim((string)$request->query('search', ''));
        $status = strtolower(trim((string)$request->query('status', '')));
        $from   = trim((string)$request->query('from', ''));
        $to     = trim((string)$request->query('to', ''));

        $where  = ['1=1'];
        $params = [];

        if ($search !== '') {
            // customer_name falls back to the linked user's name, so match on the same COALESCE
            $where[]  = '(i.invoice_number LIKE ? OR COALESCE(i.customer_name, u.name) LIKE ?)';
            $like     = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
        }
        // Date range filters the invoice date (fall back to the created date when null).
        if ($from !== '') {
            $where[]  = 'COALESCE(i.invoice_date, DATE(i.created_at)) >= ?';
            $params[] = $from;
        }
        if ($to !== '') {
            $where[]  = 'COALESCE(i.invoice_date, DATE(i.created_at)) <= ?';
            $params[] = $to;
        }
        $whereClause = implode(' AND ', $where);

        $rows = Database::fetchAll(
            "SELECT i.invoice_id,
                    i.invoice_number,
                    COALESCE(i.invoice_date, DATE(i.created_at))  AS invoice_date,
                    COALESCE(i.customer_name, u.name)             AS customer_name,
                    i.status                                      AS invoice_status,
                    i.total,
                    e.eway_id, e.ewb_no, e.ewb_date, e.valid_until, e.distance_km
             FROM invoices i
             LEFT JOIN orders     o ON o.order_id   = i.order_id
             LEFT JOIN users      u ON u.user_id    = o.user_id
             LEFT JOIN eway_bills e ON e.invoice_id = i.invoice_id
             WHERE $whereClause
             ORDER BY COALESCE(i.invoice_date, DATE(i.created_at)) DESC, i.invoice_id DESC",
            $params
        );

        $today   = date('Y-m-d');
        $summary = ['total' => 0, 'generated' => 0, 'pending' => 0, 'expired' => 0];
        $out     = [];

        foreach ($rows as $r) {
            $ewbNo      = trim((string)($r['ewb_no'] ?? ''));
            $validUntil = !empty($r['valid_until']) ? substr((string)$r['valid_until'], 0, 10) : null;
            $hasEwb     = $ewbNo !== '';

            // Status: no EWB number → pending; number + expired validity → expired; else generated.
            if (!$hasEwb) {
                $st = 'pending';
            } elseif ($validUntil !== null && $validUntil < $today) {
                $st = 'expired';
            } else {
                $st = 'generated';
            }

            $isCancelled = strtolower((string)($r['invoice_status'] ?? '')) === 'cancelled';

            // Summary reflects the search + date filtered set (independent of the status
            // filter, so the stat cards stay stable while the table narrows). Cancelled
            // invoices are still listed but excluded from the "pending" pressure.
            $summary['total']++;
            if ($st === 'generated') {
                $summary['generated']++;
            } elseif ($st === 'expired') {
                $summary['expired']++;
            } elseif (!$isCancelled) {
                $summary['pending']++;
            }

            $row = [
                'invoice_id'     => (int)$r['invoice_id'],
                'invoice_number' => (string)$r['invoice_number'],
                'invoice_date'   => !empty($r['invoice_date']) ? substr((string)$r['invoice_date'], 0, 10) : '',
                'customer_name'  => (string)($r['customer_name'] ?? ''),
                'invoice_status' => (string)($r['invoice_status'] ?? ''),
                'total'          => (float)$r['total'],
                'eway_id'        => $r['eway_id'] !== null ? (int)$r['eway_id'] : null,
                'ewb_no'         => $hasEwb ? $ewbNo : null,
                'ewb_date'       => !empty($r['ewb_date']) ? substr((string)$r['ewb_date'], 0, 10) : null,
                'valid_until'    => $validUntil,
                'distance_km'    => $r['distance_km'] !== null ? (int)$r['distance_km'] : null,
                'status'         => $st,
            ];

            // Optional status filter applies to the returned rows only.
            if ($status === '' || $status === 'all' || $status === $st) {
                $out[] = $row;
            }
        }

        Response::success(['rows' => $out, 'summary' => $summary]);
    }
}
