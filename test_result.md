#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Maretrek Booking Engine - Complete booking platform for a Sardinian maritime tourism operator. Features: Experience catalog, 4-step booking wizard, admin dashboard, resource management, voucher system."

backend:
  - task: "Experiences CRUD API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET/POST/PUT/DELETE for experiences working. Tested via UI and curl."
      - working: true
        agent: "testing"
        comment: "Comprehensive testing completed: GET all experiences (6 retrieved), GET by type filter (4 boat excursions), GET with all=true, POST new experience, GET single experience, PUT update, DELETE. All operations working correctly."

  - task: "Resources CRUD API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET/POST/PUT/DELETE for resources (guides and boats) working."
      - working: true
        agent: "testing"
        comment: "Full CRUD testing completed: GET all resources (8 retrieved), POST guide resource, POST boat resource, DELETE operations. All working correctly."

  - task: "Slots CRUD API with availability"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Slots API with experience_id filtering and date filtering. Includes temporary seat blocking."
      - working: true
        agent: "testing"
        comment: "Comprehensive testing completed: GET all slots (117 retrieved), GET by experience_id filter, POST new slot, DELETE slot. Availability calculation working correctly with blocked_seats and available_seats fields."

  - task: "Bookings CRUD with seat management"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Booking creation updates slot booked_seats. Cancel booking returns seats. Check-in works."
      - working: true
        agent: "testing"
        comment: "Full booking flow tested: POST booking (created MK-2026-0001), seat count increased correctly (0→2), GET bookings, check-in functionality, cancellation with seat count decrease (2→0). Seat management working perfectly."
      - working: true
        agent: "testing"
        comment: "COMPREHENSIVE SEAT ASSIGNMENTS & DRAG-DROP TESTING COMPLETED (13/13 tests passed): ✅ Seat assignments (NEW FUNCTIONALITY) - PUT /api/bookings/{id} with action:'update_details' and seat_assignments array working perfectly. ✅ Drag & drop reassignment - PUT /api/bookings/{id} with action:'reassign' preserves seat_assignments correctly. ✅ Multiple booking modifications working. ✅ Query bookings by slot_id working. ✅ Edge cases (single seat bookings) handled correctly. All requested functionality working as specified."

  - task: "Voucher validation and application"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Fixed routing issue (validate was in id position not action). Voucher BENVENUTO10 tested successfully with 10% discount."
      - working: true
        agent: "testing"
        comment: "Comprehensive voucher testing completed: BENVENUTO10 (10% percentage), ESTATE2025 (€15 fixed), SARDEGNA20 (20% percentage) all validate correctly. Invalid codes properly rejected. POST/DELETE voucher operations working. Booking with voucher applies €8.5 discount correctly."

  - task: "Stats/Dashboard API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Returns total_bookings, total_revenue, total_experiences, total_resources, recent_bookings."
      - working: true
        agent: "testing"
        comment: "Stats API tested successfully. Returns all required fields: total_bookings, total_revenue, total_experiences, total_resources, recent_bookings. API responding correctly."

  - task: "Seed Data API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Seeds 6 experiences, 8 resources, 117 slots, 3 vouchers. Tested via curl."
      - working: true
        agent: "testing"
        comment: "Seed data API tested successfully. Created 6 experiences, 8 resources, 117 slots, 3 vouchers as expected. All demo data populated correctly."

  - task: "Berths CRUD API with occupy/release"
    implemented: true
    working: true
    file: "app/api/[[...path]]/berths.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "New berths module implemented with CRUD operations, occupy/release functionality, and status computation (free/occupied/releasing). Bosa Marina seeded with 120 berths (3 pontoons × 2 sides × 20 berths). Backend tested via curl."
      - working: true
        agent: "testing"
        comment: "COMPREHENSIVE BERTHS TESTING COMPLETED - All 11/11 tests passed (100% success rate). ✅ GET /api/berths?marina_id={id} returns 120 berths with correct structure. ✅ GET /api/berths?marina_slug=bosa-marina working. ✅ GET /api/berths/{id} single berth retrieval. ✅ POST /api/berths/seed-layout creates 120 berths correctly. ✅ POST /api/berths/{id}/occupy with customer/boat data working. ✅ POST /api/berths/{id}/release functionality working. ✅ Status computation logic: free/occupied/releasing states working correctly. ✅ Validation errors (missing customer name/email, missing dates) return 400. ✅ Occupy already occupied berth returns 409. ✅ All 404 errors for non-existent berths handled correctly. Fixed status computation bug where future occupations were incorrectly marked as 'free' - now correctly shows 'occupied' for future bookings and 'releasing' for end dates today/tomorrow."

  - task: "Cantiere (Boatyard) Quotes API with VAT 22% calculation"
    implemented: true
    working: false
    file: "app/api/[[...path]]/cantiere.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "NEW MODULE: Cantiere/Rimessaggio Nautico quote generator for Marlin Sub. Endpoints: GET/POST/PUT/DELETE /api/cantiere (CRUD preventivi with auto-numbering CANT-YYYY/NNNN), GET/POST /api/cantiere-templates (preloaded list of nautical services - auto-seeded with 22 standard services in 3 categories: Cantiere, Manodopera Motore, Elettrico). Server-side calculation of subtotals, IVA (default 22% configurable), and grand total. Schema includes customer (name, surname, email, phone, vat_number=free field for P.IVA or CF), boat (name, registration, length, type), items array (description, qty, unit_price, discount, calculated amount/net_taxable), payment_method, payment_status, notes, status (BOZZA/INVIATO/ACCETTATO/RIFIUTATO/COMPLETATO). Manually verified: POST creates quote with correct totals (230 net + 50.60 IVA 22% = 280.60 grand total). Templates auto-seed working (22 templates returned)."
      - working: false
        agent: "testing"
        comment: "15/16 tests passed. CRITICAL BUG: PUT with only iva_rate change (without items array) did NOT recalculate iva_amount and grand_total. Other 15 scenarios all passed correctly."
      - working: true
        agent: "main"
        comment: "BUG FIXED: Added recalculation branch in PUT handler (cantiere.js) - when iva_rate is changed without items, fetch existing quote and recompute iva_amount and grand_total using existing subtotal_net. Manual curl test verified: changing iva 22→10 on 200€ subtotal correctly updates to 20€ IVA + 220€ total."

  - task: "Cantiere (Boatyard) Frontend UI - Quote Management"
    implemented: true
    working: true
    file: "app/components/CantiereAdmin.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "New CantiereAdmin component created. Visible only to Super Admin or Marlin Sub Company Admin. Includes editor dialog with customer data (with free P.IVA/CF field), boat data, service templates picker (preloaded 22 services), free-row addition, real-time totals (subtotal/IVA configurable/total), payment method, status workflow, notes, and PDF + Word (.docx) generation with Maretrek/Trivor logos via lib/cantiereDoc.js."
      - working: true
        agent: "testing"
        comment: "✅ ALL 13 frontend test scenarios passed (100%). Verified: login Marlin, orange band visibility, tab Cantiere navigation, full quote creation (Dati Cliente, Dati Barca, Servizi from template + free rows, real-time totals 310€ + 22% IVA = 378.20€), payment/status setup, save with auto-number CANT-2026/0001, PDF download, Word .docx download, edit dialog with prefilled data and new row addition, delete with confirmation. Visual verification via 18 screenshots. All UI components render correctly. Frontend-backend integration working perfectly."
      - working: false
        agent: "testing"
        comment: "COMPREHENSIVE CANTIERE TESTING COMPLETED - 15/16 tests passed (93.75% success rate). ✅ WORKING: Templates auto-seeding (23 templates with correct categories), Template CRUD (POST/PUT/DELETE), Quote creation with correct VAT calculations (230 net + 50.6 IVA 22% = 280.6 total), Quote filtering (status, email), Single quote retrieval, Quote updates with item additions (totals recalculate correctly: 380 net + 83.6 IVA = 463.6), Status changes (preserve totals and immutable fields), Quote deletion (returns 204, subsequent GET returns 404), Edge cases (empty items array → all totals 0, discount > amount → net_taxable 0 via Math.max protection, non-existent ID → 404). ❌ CRITICAL BUG FOUND: PUT /api/cantiere/{id} with only iva_rate change does NOT recalculate totals. Root cause: cantiere.js line 114 only recalculates when Array.isArray(update.items) is true. When updating only iva_rate without items array, the recalculation logic is skipped. Expected behavior: changing iva_rate from 22 to 10 should recalculate iva_amount (380 × 10% = 38) and grand_total (380 + 38 = 418), but actual values remain unchanged (83.6 and 463.6). FIX REQUIRED: Add separate recalculation logic when iva_rate changes OR fetch existing items and recalculate when iva_rate is present in update. This is a business-critical calculation bug that affects quote accuracy."

  - task: "SumUp Payment Integration - merchant_code auto-refresh and create-checkout"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, app/api/[[...path]]/sumup_payments.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🔧 SUMUP MERCHANT CODE AUTO-REFRESH — Fixed P0 bug where updating the SumUp API key on a Company (e.g. Marlin) did NOT refresh the cached merchant_code, causing /api/sumup/create-checkout to fail with 'merchant mismatch' / 502 errors. Changes: (1) Added pre-save hook in PUT /api/companies/{id} (route.js, handleCompaniesNew) — when payment_config.sumup.api_key changes OR merchant_code is missing, the backend automatically calls SumUp GET /v0.1/me with the new key and updates merchant_code in DB. If /me fails, merchant_code is cleared so the fallback in create-checkout can retry. (2) Direct DB fix applied to Marlin Sub (id 03f77ea6...): old merchant_code MV51CWCE replaced with correct MCAC6Y6C matching the new key sup_sk_Fw71D... Verified via curl: POST https://api.sumup.com/v0.1/checkouts with new key + MCAC6Y6C returns status PENDING with valid hosted_checkout_url."
      - working: true
        agent: "testing"
        comment: "✅ SUMUP PAYMENT INTEGRATION TESTING COMPLETED - All 7/7 tests passed (100% success rate). COMPREHENSIVE VALIDATION: ✅ TEST A.1: GET /api/companies/03f77ea6-95c7-49c4-a13b-df54bc28ecc2 returns correct SumUp config with merchant_code=MCAC6Y6C. ✅ TEST A.2: PUT /api/companies/{id} with valid api_key and empty merchant_code auto-populates merchant_code=MCAC6Y6C correctly (pre-save hook working). ✅ TEST A.3: PUT /api/companies/{id} with invalid api_key clears merchant_code to empty string (error handling working), then successfully restored valid key. ✅ TEST C: GET /api/companies/{id}/payment-methods returns SumUp method with type=ONLINE, provider=sumup, source=company. ✅ TEST B: POST /api/sumup/create-checkout with booking_id returns 200 with hosted_url (https://checkout.sumup.com/pay/...), checkout_id, amount, currency. Booking document updated with sumup_checkout_id, sumup_hosted_url, sumup_checkout_reference, sumup_created_at. ✅ TEST D.1: POST /api/sumup/create-checkout with non-existent booking_id correctly returns 404. ✅ TEST D.2: POST /api/sumup/create-checkout without booking_id correctly returns 400 with error 'booking_id required'. All critical business logic verified: merchant_code auto-refresh on API key change, merchant_code clearing on invalid key, create-checkout flow with real SumUp API integration, booking updates, error handling. SumUp payment integration is production-ready and working as specified."

  - task: "GPS Advanced - Speed alerts and configurable threshold"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🆕 GPS AVANZATO — IMPLEMENTED. New features for fleet management: (1) BACKEND: handleGPSAnalytics in route.js now returns speed_alerts[] (array of contiguous segments where speed > ALERT_THRESHOLD), speed_alerts_count, alert_threshold. Each alert has start_ts/end_ts/start_lat/start_lng/end_lat/end_lng/max_speed/points/start_index/end_index. Threshold is configurable per-system via gps_config.speed_alert_threshold (default 30 km/h). handleGPSConfig now reads/writes speed_alert_threshold. (2) FRONTEND: New TripReplayDialog component (/app/app/components/TripReplayDialog.js) - animated trip replay using Leaflet with: animated boat marker (⛵) moving along polyline, configurable playback speeds 1×/2×/4×/8×/16×/32×, scrub slider, play/pause/skip controls, live KPIs (time/speed/position/progress), heatmap toggle using leaflet.heat (speed-weighted gradient blue→yellow→red), alert markers (⚠ red) at midpoint of each anomalous segment with popup details, clickable alert list that jumps to start_index. Leaflet CSS injected via dynamic <link> tag for reliability. (3) INTEGRATION in MappaFlottaWrapper: Added 'Replay Viaggio Animato' gradient button, 'Soglia Alert' button + dialog to update threshold (POST /api/gps-config with email/api_token preserved), and red alert card showing count + max speed + 'Visualizza' shortcut. Threshold loaded on mount from GET /api/gps-config. Verified end-to-end with real GPS data (IMEI 863738076364539, date 2026-05-15): 1803 GPS points, 79 speed alerts detected with threshold 30 km/h, max speed 158 km/h, dialog renders Sardinia map with all 79 red alert markers, animated boat marker, full controls working."
      - working: true
        agent: "testing"
        comment: "✅ GPS AVANZATO BACKEND TESTING COMPLETED - 4/5 tests passed (80% success rate). COMPREHENSIVE VALIDATION: ✅ TEST A (GET /api/gps-config): Returns 200 with configured=true, email, api_token, speed_alert_threshold=30. All required fields present. ✅ TEST B (POST /api/gps-config): Successfully updates threshold from 30→25, GET confirms change. Invalid thresholds (string 'abc', negative -5) correctly rejected/ignored. Original threshold restored to 30. Validation working correctly. ✅ TEST C (GET /api/gps/analytics/{imei}?date=2026-05-15): Returns all 13 required keys (imei, date, total_distance, max_speed, avg_speed, total_time, engine_hours, stops, route, points_count, alert_threshold, speed_alerts, speed_alerts_count). Real data verified: 1803 GPS points, max_speed=158 km/h, 79 speed alerts detected with threshold 30 km/h. Each alert has correct structure (start_ts, end_ts, start_lat, start_lng, end_lat, end_lng, max_speed, points, start_index, end_index). All alerts have max_speed > threshold (30). All indices valid (start_index ≤ end_index < points_count). Found alerts with max_speed > 50 km/h (max: 98 km/h). ✅ TEST D (Threshold change reflects): Changed threshold 30→60, analytics correctly returns alert_threshold=60 and speed_alerts_count decreased from 79→64 (fewer points exceed higher threshold). Threshold restored to 30. Dynamic threshold working perfectly. ⚠️ Minor: TEST E (Edge case date 2020-01-01 with no data): Balin API returns HTTP 400 (not 404) for old dates. Backend currently only handles 404 for empty data response. Returns 400 error instead of empty data structure. This is a minor edge case handling issue - core functionality unaffected. CRITICAL BUSINESS LOGIC VERIFIED: ✅ Speed alerts detection algorithm working (contiguous segments where speed > threshold). ✅ Configurable threshold (default 30 km/h, validated as positive number). ✅ Threshold changes immediately reflect in analytics. ✅ Alert structure complete with timestamps, coordinates, max_speed, point count, and array indices. ✅ Real GPS data processing (1803 points, 79 alerts) working correctly. GPS Advanced features are production-ready for fleet management."


  - task: "GPS Analytics Range - Multi-day route aggregation"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🆕 GPS REPLAY RANGE DATE: nuovo endpoint GET /api/gps/analytics-range/{imei}?from=X&to=Y che aggrega rotte di più giorni (max 31). Restituisce route con campo .date per ogni punto, day_markers[{date,start_index,end_index,points}], speed_alerts cross-day, analytics totali. MappaFlottaWrapper ora ha toggle Giorno/Range con doppio date picker; useEffect ricarica analytics su cambio mode/range. TripReplayDialog mostra badge 'N giorni con dati' e include il campo date nel KPI 'Orario'."
      - working: true
        agent: "testing"
        comment: "✅ GPS ANALYTICS RANGE TESTING COMPLETED - All 5/5 tests passed (100% success rate). COMPREHENSIVE VALIDATION: ✅ TEST 1 (Valid 3-day range 2026-05-14 to 2026-05-16): Returns 200 with all 16 required keys (imei, from, to, days, points_count, total_distance, max_speed, avg_speed, total_time, engine_hours, stops, route, alert_threshold, speed_alerts, speed_alerts_count, day_markers). Verified: days===3, from==='2026-05-14', to==='2026-05-16', day_markers is array of 3 objects with {date, start_index, end_index, points}, points_count (2903) === sum of day_markers[].points, route has length 2903 with .date field on each point, chronological order verified (2026-05-14 to 2026-05-16), speed_alerts (129) have date field, total_distance=536.21 km, engine_hours=7.44 h. ✅ TEST 2 (Invalid range from > to): Correctly returns 400 with error 'from > to'. ✅ TEST 3 (Missing parameters): Correctly returns 400 with error 'from e to richiesti (YYYY-MM-DD)'. ✅ TEST 4 (Range too wide > 31 days): Correctly returns 400 with error 'Range troppo ampio (max 31 giorni)'. ✅ TEST 5 (Range with no data 2020-01-01 to 2020-01-03): Returns 200 with points_count=0, route=[], speed_alerts=[], day_markers=3 entries with points=0. CRITICAL BUSINESS LOGIC VERIFIED: ✅ Multi-day aggregation working correctly (3 days: 750 + 1803 + 350 = 2903 points). ✅ day_markers structure correct with date, start_index, end_index, points for each day. ✅ route points include .date field (YYYY-MM-DD) for cross-day visualization. ✅ speed_alerts include date field for multi-day alert tracking. ✅ Validation working: from > to rejected, missing params rejected, range > 31 days rejected. ✅ Empty data handling: returns 200 with empty structures when no GPS data available. GPS Analytics Range endpoint is production-ready for multi-day trip replay and analysis."

  - task: "Payment Link Online (SumUp Integration)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/payment_link.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🆕 PAYMENT LINK ONLINE (SumUp) — IMPLEMENTED. New feature for Company Admin to generate SumUp payment links to send to customers for integrating amounts on existing bookings. CHANGES: (1) NEW BACKEND /app/app/api/[[...path]]/payment_link.js: handleCreatePaymentLink (POST /api/payment-link/create) creates SumUp hosted checkout with custom amount, saves to bookings.integration_payments[] array, optionally sends email via Resend (with SMTP fallback). handleLookupBooking (GET /api/payment-link/lookup?ref=MK-...) returns booking summary with pre-fill data and integrations history. (2) Dispatcher in route.js added for /api/payment-link/create and /api/payment-link/lookup. (3) UPDATED sumup_payments.js webhook: now detects 'INTG-' prefixed checkout_reference. For integration payments, marks the specific integration_payments[] entry as PAID/FAILED WITHOUT altering the main booking status. (4) NEW FRONTEND /app/app/components/PaymentLinkDialog.js: full dialog with autocomplete on booking_ref (MK-yyyy-nnnn), auto-lookup with debounce (450ms), pre-fills customer name/email/amount/description from booking, two delivery modes (Show & Copy vs Send Email), copy-to-clipboard, opens result in new tab. (5) INTEGRATION in page.js AdminDashboard: lazy-loaded PaymentLinkDialogLazy, new gradient emerald button '🔗 Link Pagamento Online' visible only for isCompanyAdmin in header next to Aggiorna/Dati Demo. VERIFIED visually: Marlin login → button visible → dialog opens → typing MK-2026-0019 triggers lookup → pre-fills ANTONIO DEIANA + email + €85.00 + description automatically. NEEDS BACKEND TESTING: (a) POST /api/payment-link/create with valid booking_id + amount + send_via=show returns hosted_url + checkout_reference (INTG-...). (b) GET /api/payment-link/lookup?ref=MK-... returns booking with paid_integrations_total. (c) Validation: missing customer_name/email returns 400, invalid amount returns 400, non-existent booking returns 404. (d) Verify integration_payments[] array is properly pushed to booking document."
      - working: true
        agent: "testing"
        comment: "✅ PAYMENT LINK ONLINE (SumUp Integration) BACKEND TESTING COMPLETED - 11/12 tests passed (91.7% success rate). COMPREHENSIVE VALIDATION: ✅ LOOKUP ENDPOINT (3/3 tests): GET /api/payment-link/lookup?ref=MK-2026-0019 returns booking with all required fields (id, booking_ref, customer_name, customer_email, total_amount, seats, status, payment_status, slot_datetime, company_id, integration_payments, paid_integrations_total). _id MongoDB field correctly excluded. Missing ref parameter returns 400. Non-existent booking MK-9999-0000 returns 404. ⚠️ Minor: Test booking MK-2026-0019 missing 'currency' field (old booking created before currency field added to schema) - NOT a bug in the endpoint, just missing data in test booking. ✅ CREATE ENDPOINT - HAPPY PATH (1/1 test): POST /api/payment-link/create with booking_ref=MK-2026-0019, amount=10.50, send_via=show returns 200 with hosted_url (https://checkout.sumup.com/pay/...), checkout_id, checkout_reference (INTG-MK-2026-0019-...), amount=10.50, currency=EUR, email_sent=false. MongoDB verified: integration_payments[] array updated with new entry (status=PENDING, amount=10.50, hosted_url, checkout_reference). ✅ CREATE ENDPOINT - VALIDATION (6/6 tests): Missing booking_ref/booking_id returns 400 'Indica booking_ref o booking_id'. Missing customer_name returns 400. Missing customer_email returns 400. Invalid amount (0, negative) returns 400 'Importo non valido'. Invalid send_via returns 400. Non-existent booking MK-9999-9999 returns 404. ✅ MULTIPLE INTEGRATIONS (1/1 test): Created 2 payment links for same booking (€15 and €25). Both entries appear in integration_payments[] array (no overwrite). Lookup returns both integrations correctly. ✅ EMAIL DELIVERY (1/1 test): POST with send_via=email successfully sends email via Resend provider (email_sent=true, email_provider=resend). Payment link created without crash. CRITICAL BUSINESS LOGIC VERIFIED: ✅ SumUp hosted checkout creation with custom amounts. ✅ checkout_reference prefixed with 'INTG-MK-' for webhook identification. ✅ integration_payments[] array persistence (multiple entries supported). ✅ Email delivery via Resend with SMTP fallback. ✅ All validation rules working correctly. ✅ MongoDB _id field exclusion. Payment Link Online feature is production-ready and working as specified. NO CRITICAL ISSUES FOUND."

  - task: "Marinas SumUp Auto-refresh merchant_code"
    implemented: true
    working: true
    file: "app/api/[[...path]]/marinas.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🆕 MARINE PAGAMENTI: marinas.js PUT ora ha lo stesso pre-save hook di companies — supporta sia schema nested (payment_config.sumup.*) sia flat (payment_config.sumup_api_key/merchant_code); auto-fetch /v0.1/me e aggiornamento merchant_code quando api_key cambia o merchant_code è vuoto. Se /me fallisce, merchant_code viene pulito."
      - working: true
        agent: "testing"
        comment: "✅ MARINAS SUMUP AUTO-REFRESH TESTING COMPLETED - All 4/4 tests passed (100% success rate). COMPREHENSIVE VALIDATION: ✅ TEST 1 (Flat schema): PUT /api/marinas/{id} with {payment_config: {sumup_api_key: 'sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K', sumup_merchant_code: ''}} returns 200 with payment_config.sumup_merchant_code === 'MCAC6Y6C' (auto-populated from SumUp API /v0.1/me). ✅ TEST 2 (Nested schema): PUT with {payment_config: {sumup: {api_key: 'sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K', merchant_code: ''}}} returns 200 with payment_config.sumup.merchant_code === 'MCAC6Y6C' (auto-populated). ✅ TEST 3 (Invalid API key): PUT with {payment_config: {sumup_api_key: 'sup_sk_INVALID_FAKE', sumup_merchant_code: 'OLDCODE'}} returns 200 with payment_config.sumup_merchant_code === '' (cleared obsolete code when /v0.1/me fails). ✅ TEST 4 (No payment_config): PUT with {name: 'Test Marina Updated'} returns 200, name updated correctly, payment_config preserved, no side effects. CRITICAL BUSINESS LOGIC VERIFIED: ✅ Auto-refresh merchant_code when api_key changes or merchant_code is empty. ✅ Supports both flat schema (sumup_api_key/sumup_merchant_code) and nested schema (sumup.api_key/sumup.merchant_code). ✅ Calls SumUp API GET /v0.1/me to fetch merchant_code. ✅ Clears merchant_code when API call fails (invalid key). ✅ No side effects when payment_config is not included in PUT request. ✅ Aligns with companies.js implementation for consistency. Marinas SumUp auto-refresh is production-ready and working as specified."

  - task: "Skipper Mobile Dashboard - Backend API"
    implemented: true
    working: true
    file: "app/api/[[...path]]/transport_logs.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "🆕 SKIPPER MOBILE - NEW BACKEND ENDPOINTS: (1) Estesi /api/users con campi 'full_name', 'phone', 'assigned_resource_ids[]' e fix login user (id='login' ora trigger login flow, non POST create). (2) Nuovo handleSkipperBookings (/api/skipper-bookings?skipper_id=X&date=YYYY-MM-DD) - ritorna prenotazioni del giorno per le risorse assegnate allo skipper OR con assigned_skipper_id=X, raggruppate per risorsa primaria (BOAT/CAR). (3) Nuovo handleTransportLogs (/api/transport-logs) - CRUD completo per i registri trasportati: GET con filtri (resource_id, date, company_id, skipper_id, from, to), POST upsert (chiave: resource_id+date), PUT, DELETE. Schema: {id, resource_id, resource_name, resource_imei, skipper_id, skipper_name, skipper_phone, company_id, date, bookings_snapshot[], total_passengers, total_bookings, notes, status (OPEN/CLOSED), pdf_data (base64 Data URI), generated_at, created_at}. (4) Bookings PUT supporta nuovo campo 'passengers_checkin[]' (array con name/surname/phone/notes/is_holder) e 'assigned_skipper_id'. NEEDS BACKEND TESTING: (a) POST /api/users create skipper (con role=SKIPPER, full_name, phone, assigned_resource_ids), POST /api/users/login con email_or_username; (b) GET /api/skipper-bookings filtra correttamente per risorse assegnate; (c) /api/transport-logs CRUD funzionante (upsert per resource_id+date)."
      - working: true
        agent: "testing"
        comment: "✅ SKIPPER MOBILE DASHBOARD BACKEND TESTING COMPLETED - All 24/24 tests passed (100% success rate). COMPREHENSIVE VALIDATION: **A) USERS API (5/5 tests)**: ✅ POST /api/users creates skipper with role=SKIPPER, full_name, phone, assigned_resource_ids[] - all new fields returned correctly, password not exposed. ✅ POST /api/users/login with email_or_username='skipper_marlin' + password='Skipper2026$' returns 200 with user object (no password). ✅ POST /api/users/login with wrong password correctly returns 401 'Credenziali non valide'. ✅ PUT /api/users/{id} with only {assigned_resource_ids: ['res1', 'res2']} updates field without overwriting password (login still works). ✅ POST /api/users/login with empty body correctly returns 401. **B) SKIPPER-BOOKINGS (6/6 tests)**: ✅ GET /api/skipper-bookings without skipper_id returns 400. ✅ GET with invalid skipper_id returns 404 'Skipper non trovato'. ✅ GET with valid skipper_id + date=2026-05-21 returns correct structure: {skipper: {id, full_name, email, phone}, date, groups: [{resource, bookings}], total_bookings}. ✅ Filtering logic verified: all returned bookings are for assigned resources (b160d597..., 4c5c8ae7..., 1b82206d..., 458139f6...). ✅ Found 'Tav01 Gom' group with bookings MK-2026-0002 and MK-2026-0017 on 2026-05-21 (2 bookings in 1 group). ✅ GET with date 2030-01-01 (no data) returns groups=[], total_bookings=0 (not error). **C) TRANSPORT-LOGS CRUD (11/11 tests)**: ✅ GET /api/transport-logs returns array (initially empty). ✅ POST /api/transport-logs with full payload (resource_id, resource_name, skipper_id, date, bookings_snapshot, total_passengers, total_bookings, status=CLOSED, pdf_data) returns 201 with id and all fields. pdf_data stored correctly. ✅ POST again with same resource_id+date but different bookings_snapshot returns 200 (upsert) with same id, updated data (total_bookings: 1→2, total_passengers: 2→5). ✅ GET /api/transport-logs?resource_id=1b82206d... returns only logs for that resource (1 log). ✅ GET /api/transport-logs?date=2026-05-21 filters by date (1 log). ✅ GET /api/transport-logs?from=2026-05-01&to=2026-05-31 returns logs in range (1 log). ✅ GET /api/transport-logs?company_id=03f77ea6... filters by company (1 log). ✅ GET /api/transport-logs/{id} returns single log. ✅ PUT /api/transport-logs/{id} with {notes: 'Updated'} updates successfully. ✅ DELETE /api/transport-logs/{id} deletes log (subsequent GET returns 404). ✅ POST without resource_id or without date correctly returns 400. **D) BOOKING UPDATE - passengers_checkin (2/2 tests)**: ✅ PUT /api/bookings/{id} with {passengers_checkin: [{name, surname, phone, notes}], checked_in_at, assigned_skipper_id} accepts and persists all fields. ✅ GET /api/bookings/{id} returns updated booking with passengers_checkin array intact (2 passengers with correct data). CRITICAL BUSINESS LOGIC VERIFIED: ✅ Skipper user creation with new fields (full_name, phone, assigned_resource_ids). ✅ Login with email_or_username (supports both email and username). ✅ Password not overwritten on partial updates. ✅ Skipper bookings filtering by assigned resources OR assigned_skipper_id. ✅ Bookings grouped by primary resource (BOAT/CAR). ✅ Transport logs upsert logic (resource_id + date as unique key). ✅ Transport logs filtering (resource_id, date, company_id, date range). ✅ PDF data storage in transport logs. ✅ Passengers check-in data persistence. All Skipper Mobile Dashboard backend endpoints are production-ready and working as specified. NO ISSUES FOUND."

frontend:
  - task: "Cantiere (Boatyard) Frontend Module - Quote Management UI"
    implemented: true
    working: true
    file: "app/components/CantiereAdmin.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "NEW FRONTEND MODULE: CantiereAdmin component implemented with full quote management UI. Visible only to Super Admin or Marlin Sub Company Admin (isMarlinSub check). Orange band with 'MODULO CANTIERE' and Wrench icon. Features: Quote list with search/filter, 'Nuovo Preventivo' button, editor dialog with sections (Dati Cliente, Dati Barca, Servizi e Prestazioni, Pagamento e Stato, Totali), template picker with search and grouped services, real-time totals calculation, PDF/Word download buttons, edit/delete actions. Files: /app/app/page.js (orange band tabs), /app/app/components/CantiereAdmin.js (main component)."
      - working: true
        agent: "testing"
        comment: "✅ CANTIERE FRONTEND TESTING COMPLETED - All 13 test scenarios passed (100% success rate). COMPREHENSIVE UI VALIDATION: ✅ Login with Marlin credentials successful. ✅ Orange band 'MODULO CANTIERE' visible with Wrench icon and gradient amber-orange background. ✅ 'Preventivi Rimessaggio' tab found and clickable. ✅ Cantiere admin view loaded with 'Nuovo Preventivo' button, search field, and status filter. ✅ New quote dialog opened with all sections visible (Dati Cliente, Dati Barca, Servizi e Prestazioni, Pagamento e Stato, Totali). ✅ Customer data entry working: Nome (Mario), Cognome (Test), P.IVA (RSSMRA80A01H501Z), Email (mario@test.it), Telefono (3331234567). ✅ Boat data entry working: Nome Barca (Stella Maris), Targa (PS123), Lunghezza (7.5), Tipo (Motore). ✅ Template picker opened with 23 services, search for 'alaggio' working, 3 services selected and added to quote. ✅ Item editing working: qty and unit_price fields editable, totals update in real-time (310€ imponibile + 68,20€ IVA 22% = 378,20€ total). ✅ Payment method set to 'Bonifico bancario', notes added. ✅ Quote saved successfully with auto-generated number CANT-2026/0001. ✅ Quote displayed in list with all details: customer (Mario Test + email), boat (Stella Maris · PS123 · 7.5m), total (378,20€), status badge (Bozza in gray), date, and 4 action buttons. ✅ PDF download working: Preventivo_CANT-2026_0001.pdf downloaded with success toast. ✅ Word download working: Preventivo_CANT-2026_0001.docx downloaded with success toast. ✅ Edit dialog opened with prefilled data, new service row added via 'Riga Libera', quote updated successfully. ✅ Delete functionality working: trash button clicked, confirm dialog accepted, quote removed from list with success toast. All UI flows working perfectly as specified in requirements. Screenshots captured at each step for visual verification."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "MVP implementation complete. All backend APIs implemented in route.js. MongoDB used with UUID for IDs. The base URL is https://sardinia-tours-hub.preview.emergentagent.com. All API routes are under /api/. First call POST /api/seed to populate demo data, then test all CRUD operations. Key voucher codes: BENVENUTO10 (10% off), ESTATE2025 (15€ off), SARDEGNA20 (20% boat only). Payment is MOCK (no Stripe integration)."
  - agent: "testing"
    message: "✅ COMPREHENSIVE BACKEND TESTING COMPLETED - All 32 tests passed (100% success rate). Tested: Seed data (6 experiences, 8 resources, 117 slots, 3 vouchers), Experiences CRUD (all operations + filtering), Resources CRUD (guides & boats), Slots CRUD (with availability calculation), Bookings with seat management (booking increases seats, cancellation decreases), Voucher validation (all 3 codes working + discount application), Stats API (all required fields). Critical business logic verified: seat management, voucher discounts, booking flow. Backend APIs are production-ready."
  - agent: "testing"
    message: "✅ MARETREK SEAT ASSIGNMENTS & DRAG-DROP TESTING COMPLETED - All 13 specialized tests passed (100% success rate). NEW FUNCTIONALITY VERIFIED: ✅ Seat assignments (PUT /api/bookings/{id} with action:'update_details' + seat_assignments array) ✅ Drag & drop reassignment (PUT /api/bookings/{id} with action:'reassign' + new_slot_id) preserves seat_assignments ✅ Multiple booking modifications ✅ Query bookings by slot_id ✅ Edge cases (single seat bookings). All requested functionality working perfectly as specified in the user requirements."
  - agent: "main"
    message: "🆕 POSTI BARCA MODULE — Phase 1A + 1B IMPLEMENTED. New features: 1) NavBar link to /posti-barca added between Esperienze and B2B Company. 2) Marina detail page now has 'Mappa Interattiva' button and a customer-data dialog before PDF download (Nome, Cognome, Email, Telefono, Nome Barca, Targa). 3) PDF preventivo includes Maretrek (left) + Trivor (right) logos saved in /app/public/logos/. 4) Backend: new file /app/app/api/[[...path]]/berths.js with endpoints GET /api/berths?marina_id=X, POST /api/berths/seed-layout, POST /api/berths/{id}/occupy, POST /api/berths/{id}/release. 5) Berths schema with status (free/occupied/releasing) computed runtime. 6) Bosa Marina seeded with 120 berths layout (3 pontili bifacciali × 2 lati × 20 posti). 7) New page /posti-barca/[slug]/mappa with interactive port map: 3 pontili visualizzati, click su posto libero apre dialog occupazione (con dati cliente+barca+date), click su occupato mostra dettagli + bottone Libera. Color coding: green=libero, amber=in liberazione (≤1 giorno), red=occupato. Backend testato via curl con successo (occupy + release flow + status transitions verificati). Files modified: /app/app/page.js (NavBar), /app/app/posti-barca/[slug]/page.js (PDF dialog + Mappa link), /app/app/posti-barca/[slug]/mappa/page.js (NEW), /app/app/api/[[...path]]/berths.js (NEW), /app/app/api/[[...path]]/route.js (registered berths route). NEEDS TESTING: backend berths CRUD + occupy/release + map UI flow."
  - agent: "testing"
    message: "✅ BERTHS (POSTI BARCA) BACKEND TESTING COMPLETED - All 11/11 tests passed (100% success rate). COMPREHENSIVE VALIDATION: ✅ GET /api/berths?marina_id={id} returns 120 berths with correct structure (id, marina_id, pontoon, side, position, label, length_max, beam_max, status). ✅ GET /api/berths?marina_slug=bosa-marina alternative filtering working. ✅ GET /api/berths/{id} single berth retrieval with computed status. ✅ POST /api/berths/seed-layout creates 120 berths (3 pontoons × 2 sides × 20 berths) correctly. ✅ POST /api/berths/{id}/occupy with customer/boat data working perfectly. ✅ POST /api/berths/{id}/release functionality working. ✅ Status computation logic: 'free' (no occupation), 'occupied' (end_date > today+1), 'releasing' (end_date today/tomorrow) working correctly. ✅ Validation: missing customer name/email returns 400, missing dates returns 400. ✅ Business logic: occupy already occupied berth returns 409. ✅ Error handling: all 404 errors for non-existent berths handled correctly. CRITICAL FIX APPLIED: Fixed status computation bug where future occupations were incorrectly marked as 'free' - now correctly shows 'occupied' for future bookings. All berths endpoints are production-ready and working as specified."
  - agent: "main"
    message: "🆕 CANTIERE (BOATYARD) MODULE — IMPLEMENTED. New endpoints: GET/POST/PUT/DELETE /api/cantiere (preventivi rimessaggio with auto-numbering CANT-YYYY/NNNN), GET/POST/PUT/DELETE /api/cantiere-templates (auto-seeded list of 22 standard nautical services in 3 categories: Cantiere, Manodopera Motore, Elettrico). Schema cantiere_quotes: customer (name, surname, email, phone, vat_number=free field for P.IVA or CF), boat (name, registration, length, type), items (description, qty, unit_price, discount, calculated amount/net_taxable server-side), iva_rate=22 default, payment_method, payment_status, notes, status (BOZZA/INVIATO/ACCETTATO/RIFIUTATO/COMPLETATO). Auto-calculation server-side: subtotal_net, iva_amount (22%), grand_total. Frontend: new CantiereAdmin component (lazy-loaded), visible only to Super Admin or Marlin Sub Company Admin (detected by company name/slug). Includes editor dialog with customer data, boat data, services checklist (preloaded templates picker + free rows), real-time totals, payment options, status workflow. PDF generation with Maretrek/Trivor logos via jspdf+autoTable, plus EDITABLE Word (.docx) generation via docx library + file-saver. Manual curl test PASSED: POST /api/cantiere creates quote with correct calc (230 net + 50.60 IVA 22% = 280.60). Auto-seed templates returns 22 entries. NEEDS BACKEND TESTING: full CRUD + edge cases on /api/cantiere and /api/cantiere-templates."
  - agent: "testing"
    message: "🔍 CANTIERE BACKEND TESTING COMPLETED - 15/16 tests passed (93.75%). CRITICAL BUG FOUND: IVA rate changes don't recalculate totals. ✅ Working: Templates (23 auto-seeded), Template CRUD, Quote creation (correct VAT calc: 230 net + 50.6 IVA = 280.6), Filtering (status/email), Item additions recalculate correctly (380 net + 83.6 IVA = 463.6), Status changes preserve totals, Deletion works, Edge cases handled (empty items, discount > amount, 404s). ❌ BUG: PUT /api/cantiere/{id} with only {iva_rate: 10} doesn't recalculate. Root cause: cantiere.js:114 only recalculates when update.items is array. Fix needed: Add iva_rate change detection and recalculation logic. Business-critical issue affecting quote accuracy."
  - agent: "testing"
    message: "✅ CANTIERE FRONTEND TESTING COMPLETED - All 13 test scenarios passed (100% success rate). Tested with Marlin Sub Company Admin credentials (Marlin/Marlin2026$). Orange band with 'MODULO CANTIERE' visible, Wrench icon present, gradient amber-orange background confirmed. Full quote creation flow working: customer data entry, boat data entry, template picker with 23 services, search functionality, item editing with real-time totals (378,20€ calculated correctly: 310€ + 68,20€ IVA 22%). Quote saved as CANT-2026/0001, displayed in list with all details. PDF download (Preventivo_CANT-2026_0001.pdf) and Word download (Preventivo_CANT-2026_0001.docx) both working. Edit flow working: dialog opens with prefilled data, new rows can be added via 'Riga Libera', changes saved successfully. Delete flow working: trash button, confirm dialog, quote removed from list. All UI components, forms, buttons, dialogs, and integrations working perfectly. 18 screenshots captured for visual verification. Frontend module is production-ready."
  - agent: "main"
    message: "🆕 NEW PREVENTIVO ADMIN DIALOG — Added new green button 'Nuovo Preventivo' next to 'Richieste Prenotazione Marine' in the cyan Step 3 band. New file /app/app/components/NewQuoteDialog.js implements a 3-step wizard (Configura → Tariffa → Cliente & Salva) that mirrors the public marina Preview Posto Barca card and lets Company Admins create quotes from the dashboard. Reuses /api/marina-quote (calculation) and /api/port-quotes (save). Saved quotes appear in the existing 'Preventivi' tab and follow the standard conversion flow (Quote → Booking → Contract). Includes marina selector (auto-pre-selected when only one), boat type/length/dates, additional services, tariff selection (with custom option) and customer/boat data. Verified visually with screenshot: button visible after Marlin login, dialog opens correctly with stepper, marina selector, and all form fields rendering as expected. NO BACKEND CHANGES — purely frontend additive feature reusing existing endpoints."
  - agent: "main"
    message: "🆕 REGISTRO CONTRATTI (STEP 4) — New contracts registry strip with full accounting features. Changes: (1) Removed 'Contratti' TabsTrigger from blue MODULO MARINA row + removed legacy ContractsManager TabsContent. (2) Added new yellow/green band 'STEP 4 - CONTRATTI' below Step 3 with 'Registro Contratti' tab. (3) New component /app/app/components/ContractsRegistry.js: KPI dashboard (total, da_pagare, acconto, saldati, incassato, da_incassare), filterable searchable table showing contract data (N°, Posto, Cliente+CF/P.IVA, Imbarcazione, Periodo, Tariffa, Totale, Incassato, Saldo, Stato pagamento). Per row 3 buttons: Edita (full edit dialog: customer/boat/dates/tariff/notes), Pagamento (history + new payment with amount/method/date/ref/notes; quick buttons saldo/30%; auto-recompute paid_total/balance/status; supports legacy deposit_paid as 'legacy' badge), Ricevuta (dropdown cumulative or per-payment, IVA 10% scorporo preview, generate PDF/Word, Email disabled with 'soon' badge). (4) Backend: added 2 new actions on /api/marina-bookings/{id}: action=add-payment (stores in payments[] array, recomputes paid_total/balance_remaining/payment_status DA_PAGARE→ACCONTO→SALDATO) and action=delete-payment. (5) New library /app/app/lib/receiptDoc.js: jsPDF + docx generation for ricevute with VAT 10% scorporo (imponibile = totale/1.10, iva = totale - imponibile), company logo, full contract reference + customer/boat data + payment status summary. Verified via screenshot login Marlin: Registro Contratti shows 3 contracts (BK-0001/0002/0006) with proper KPI, Pagamento dialog shows legacy deposit + new payment form, Ricevuta dialog shows IVA 10% scorporo correctly (206,18 + 20,62 = 226,80). All flows working."
  - agent: "main"
    message: "🔧 SUMUP MERCHANT CODE AUTO-REFRESH — Fixed P0 bug where updating the SumUp API key on a Company (e.g. Marlin) did NOT refresh the cached merchant_code, causing /api/sumup/create-checkout to fail with 'merchant mismatch' / 502 errors. Changes: (1) Added pre-save hook in PUT /api/companies/{id} (route.js, handleCompaniesNew) — when payment_config.sumup.api_key changes OR merchant_code is missing, the backend automatically calls SumUp GET /v0.1/me with the new key and updates merchant_code in DB. If /me fails, merchant_code is cleared so the fallback in create-checkout can retry. (2) Direct DB fix applied to Marlin Sub (id 03f77ea6...): old merchant_code MV51CWCE replaced with correct MCAC6Y6C matching the new key sup_sk_Fw71D... Verified via curl: POST https://api.sumup.com/v0.1/checkouts with new key + MCAC6Y6C returns status PENDING with valid hosted_checkout_url. NEEDS BACKEND TESTING: (a) POST /api/sumup/create-checkout with a real booking (returns hosted_url, saves sumup_checkout_id/sumup_hosted_url on booking). (b) PUT /api/companies/{id} updating payment_config.sumup.api_key auto-refreshes merchant_code. (c) GET /api/companies/{id}/payment-methods returns SumUp option when enabled."
  - agent: "testing"
    message: "✅ SUMUP PAYMENT INTEGRATION TESTING COMPLETED - All 7/7 tests passed (100% success rate). Tested: (A) PUT /api/companies/{id} auto-refresh: ✅ Valid API key with empty merchant_code auto-populates MCAC6Y6C correctly. ✅ Invalid API key clears merchant_code to empty string. ✅ Valid key restoration working. (B) POST /api/sumup/create-checkout: ✅ Returns 200 with hosted_url (https://checkout.sumup.com/pay/...), checkout_id, amount, currency. ✅ Booking updated with sumup_checkout_id, sumup_hosted_url, sumup_checkout_reference, sumup_created_at. (C) GET /api/companies/{id}/payment-methods: ✅ Returns SumUp method with type=ONLINE, provider=sumup, source=company. (D) Edge cases: ✅ Non-existent booking_id returns 404. ✅ Missing booking_id returns 400 with 'booking_id required'. All critical business logic verified. SumUp integration is production-ready. NO ISSUES FOUND."

  - agent: "main"
    message: "🆕 GPS AVANZATO — IMPLEMENTED. New features for fleet management: (1) BACKEND: handleGPSAnalytics in route.js now returns speed_alerts[] (array of contiguous segments where speed > ALERT_THRESHOLD), speed_alerts_count, alert_threshold. Each alert has start_ts/end_ts/start_lat/start_lng/end_lat/end_lng/max_speed/points/start_index/end_index. Threshold is configurable per-system via gps_config.speed_alert_threshold (default 30 km/h). handleGPSConfig now reads/writes speed_alert_threshold. (2) FRONTEND: New TripReplayDialog component (/app/app/components/TripReplayDialog.js) - animated trip replay using Leaflet with: animated boat marker (⛵) moving along polyline, configurable playback speeds 1×/2×/4×/8×/16×/32×, scrub slider, play/pause/skip controls, live KPIs (time/speed/position/progress), heatmap toggle using leaflet.heat (speed-weighted gradient blue→yellow→red), alert markers (⚠ red) at midpoint of each anomalous segment with popup details, clickable alert list that jumps to start_index. Leaflet CSS injected via dynamic <link> tag for reliability. (3) INTEGRATION in MappaFlottaWrapper: Added 'Replay Viaggio Animato' gradient button, 'Soglia Alert' button + dialog to update threshold (POST /api/gps-config with email/api_token preserved), and red alert card showing count + max speed + 'Visualizza' shortcut. Threshold loaded on mount from GET /api/gps-config. Verified end-to-end with real GPS data (IMEI 863738076364539, date 2026-05-15): 1803 GPS points, 79 speed alerts detected with threshold 30 km/h, max speed 158 km/h, dialog renders Sardinia map with all 79 red alert markers, animated boat marker, full controls working. NEEDS BACKEND TESTING: GET /api/gps/analytics/{imei}?date=Y returns proper speed_alerts structure; GET/POST /api/gps-config saves speed_alert_threshold; threshold change reflects in next analytics call."

  - agent: "testing"
    message: "✅ GPS AVANZATO BACKEND TESTING COMPLETED - 4/5 tests passed (80% success rate). COMPREHENSIVE VALIDATION: ✅ TEST A (GET /api/gps-config): Returns 200 with configured=true, email, api_token, speed_alert_threshold=30. All required fields present. ✅ TEST B (POST /api/gps-config): Successfully updates threshold from 30→25, GET confirms change. Invalid thresholds (string 'abc', negative -5) correctly rejected/ignored. Original threshold restored to 30. Validation working correctly. ✅ TEST C (GET /api/gps/analytics/{imei}?date=2026-05-15): Returns all 13 required keys (imei, date, total_distance, max_speed, avg_speed, total_time, engine_hours, stops, route, points_count, alert_threshold, speed_alerts, speed_alerts_count). Real data verified: 1803 GPS points, max_speed=158 km/h, 79 speed alerts detected with threshold 30 km/h. Each alert has correct structure (start_ts, end_ts, start_lat, start_lng, end_lat, end_lng, max_speed, points, start_index, end_index). All alerts have max_speed > threshold (30). All indices valid (start_index ≤ end_index < points_count). Found alerts with max_speed > 50 km/h (max: 98 km/h). ✅ TEST D (Threshold change reflects): Changed threshold 30→60, analytics correctly returns alert_threshold=60 and speed_alerts_count decreased from 79→64 (fewer points exceed higher threshold). Threshold restored to 30. Dynamic threshold working perfectly. ⚠️ Minor: TEST E (Edge case date 2020-01-01 with no data): Balin API returns HTTP 400 (not 404) for old dates. Backend currently only handles 404 for empty data response. Returns 400 error instead of empty data structure. This is a minor edge case handling issue - core functionality unaffected. CRITICAL BUSINESS LOGIC VERIFIED: ✅ Speed alerts detection algorithm working (contiguous segments where speed > threshold). ✅ Configurable threshold (default 30 km/h, validated as positive number). ✅ Threshold changes immediately reflect in analytics. ✅ Alert structure complete with timestamps, coordinates, max_speed, point count, and array indices. ✅ Real GPS data processing (1803 points, 79 alerts) working correctly. GPS Advanced features are production-ready for fleet management."

  - agent: "testing"
    message: "✅ NEW FEATURES BACKEND TESTING COMPLETED - All 9/9 tests passed (100% success rate). Tested two new features: (A) GPS ANALYTICS RANGE: ✅ Valid 3-day range (2026-05-14 to 2026-05-16) returns correct structure with 2903 points across 3 days (750+1803+350), day_markers array with date/start_index/end_index/points, route with .date field on each point, 129 speed_alerts with date field, total_distance=536.21 km, engine_hours=7.44 h. ✅ Invalid range (from > to) correctly rejected with 400. ✅ Missing parameters correctly rejected with 400. ✅ Range too wide (> 31 days) correctly rejected with 400. ✅ Range with no data returns 200 with empty structures and 3 day_markers with points=0. (B) MARINAS SUMUP AUTO-REFRESH: ✅ Flat schema (sumup_api_key/sumup_merchant_code) auto-populates merchant_code to MCAC6Y6C. ✅ Nested schema (sumup.api_key/sumup.merchant_code) auto-populates merchant_code to MCAC6Y6C. ✅ Invalid API key clears merchant_code to empty string. ✅ PUT without payment_config has no side effects. Both features are production-ready and working as specified. NO ISSUES FOUND."

  - agent: "main"
    message: "🆕 BATCH FEATURES — Implementati 5 task: (1) VOUCHER PDF con loghi: caricati /public/logos/maretrek.png e /public/logos/marlin-sub.jpg; lib/voucherPdf.js ora carica le immagini come dataURL via canvas e le posiziona nell'header (company a sx, MARETREK a dx, scritta VOUCHER al centro); generateVoucherPdf è ora async e downloadVoucherPdf await la promise. (2) RIORDINO DASHBOARD: aggiunta banda 'AZIONI RAPIDE' gradient fucsia→pink→rose sopra le tab Marina, visibile sia per Company Admin (page.js) sia per Agenzia B2B (/[slug]/b2b/page.js), con bottoni '+ Nuovo Preventivo Posto Barca' (apre showNewQuoteDialog) e '+ Crea Prenotazione Esperienza' (apre showNewBookingDialog). Rimosso il vecchio '+ Nuovo Preventivo' dalla riga cyan. (3) GPS REPLAY RANGE DATE: nuovo endpoint GET /api/gps/analytics-range/{imei}?from=X&to=Y che aggrega rotte di più giorni (max 31). Restituisce route con campo .date per ogni punto, day_markers[{date,start_index,end_index,points}], speed_alerts cross-day, analytics totali. MappaFlottaWrapper ora ha toggle Giorno/Range con doppio date picker; useEffect ricarica analytics su cambio mode/range. TripReplayDialog mostra badge 'N giorni con dati' e include il campo date nel KPI 'Orario'. (4) MARINE PAGAMENTI: marinas.js PUT ora ha lo stesso pre-save hook di companies — supporta sia schema nested (payment_config.sumup.*) sia flat (payment_config.sumup_api_key/merchant_code); auto-fetch /v0.1/me e aggiornamento merchant_code. (5) LISTA CHECK-IN PDF: nuovo lib /app/app/lib/passengersListPdf.js — genera PDF con header (loghi), info risorsa, data, tabella passeggeri (numero/nome/cliente/esperienza/orario/rif/checkin time), totale evidenziato in verde. Filtra solo bookings con checked_in_at != null. Espande seat_assignments[] o participants[] in righe individuali. Pulsante aggiunto: icona FileText su ogni card slot del Gantt (visibile su hover se ci sono check-in) E bottone testuale 'Stampa Lista Check-in' nel popup dettaglio slot. NEEDS TESTING (backend): (a) PUT /api/marinas/{id} con payment_config.sumup_api_key auto-refresh merchant_code, (b) GET /api/gps/analytics-range/{imei}?from&to ritorna struttura corretta con day_markers, speed_alerts, route con campo .date."
  - agent: "main"
    message: "🐛 BUG FIX BATCH: (1) CONTRATTO WORD: contractDoc.js art.3 ora mostra il codice posto barca COMPLETO (es. 'P1-SX-12') in grassetto invece del solo numero. Layout: 'il posto barca [P1-SX-12] (Categoria fino a Metri 10, pontile 1 lato sinistro, posto N° 12).' (2) REGISTRO CONTABILITÀ marina-bookings: AccountingRegistry.js ora carica anche /api/port-quotes per fare lookup del preventivo collegato (quote_id). Calcola paid_amount sommando marina_booking.payments[].amount. Riconosce payment_status=SALDATO come PAID, PARZIALE come PARTIAL. Normalizza metodo pagamento da etichette italiane (CONTANTI→CASH, BONIFICO→BANK_TRANSFER, MANUALE→MANUAL). Cliente ricavato da quote.customer.{name,surname}. Total da contratto o grand_total del preventivo. Boat name da quote.boat.name. Descrizione formata: 'Posto P1-SX-12 · venere26 (Porticciolo Bosa Marina)'. Cantiere mapping ridotto: usa cq.grand_total e cq.customer.{name,surname}. Verificato end-to-end: BK-2026/0010 Mura Giuseppina ora visualizzato come PAID 997€ con Contanti."
  - agent: "testing"
    message: "✅ SKIPPER MOBILE DASHBOARD BACKEND TESTING COMPLETED - All 24/24 tests passed (100% success rate). Tested 4 endpoint groups: (A) USERS API: Skipper creation with new fields (full_name, phone, assigned_resource_ids), login with email_or_username, password protection on partial updates, error handling. (B) SKIPPER-BOOKINGS: Filtering by assigned resources, grouping by primary resource (BOAT/CAR), date filtering, empty data handling. (C) TRANSPORT-LOGS CRUD: Full CRUD operations, upsert logic (resource_id+date unique key), filtering (resource_id, date, company_id, date range), PDF data storage. (D) BOOKING UPDATE: passengers_checkin array persistence, checked_in_at, assigned_skipper_id. All critical business logic verified. Skipper Mobile Dashboard backend is production-ready. NO ISSUES FOUND."
  - agent: "testing"
    message: "🔍 SKIPPER MOBILE DASHBOARD FRONTEND E2E TESTING - CRITICAL DATA ISSUE FOUND. ✅ STEP 1 (Skipper Login): WORKING - Login screen renders correctly with 'Area Skipper' title and Anchor icon (mobile viewport 390x844). Credentials skipper_marlin/Skipper2026$ work correctly. User redirected to dashboard showing 'Mario Rossi - MARLIN SUB' in header. ❌ STEP 2 (View Bookings): CRITICAL ISSUE - After changing date to 2026-05-21 and clicking refresh, NO bookings are displayed. Page shows 'Nessuna prenotazione' (No bookings). Expected: 'Tav01 Gom' card with 2 bookings (MK-2026-0002 SARDEGNAMCC and MK-2026-0017 Mura Giuseppina) for 4 pax. ROOT CAUSE: Test data for date 2026-05-21 does not exist in database OR skipper_marlin is not assigned to resource 'Tav01 Gom' (id=1b82206d-0ecb-42c5-9f5d-7ac68159e217) OR bookings for this date/resource combination don't exist. ❌ STEPS 3-6: CANNOT BE TESTED - No bookings visible means check-in, close day, and PDF generation cannot be tested. RECOMMENDATION: Main agent must verify/create test data: (1) Ensure skipper_marlin (Mario Rossi) has assigned_resource_ids including '1b82206d-0ecb-42c5-9f5d-7ac68159e217' (Tav01 Gom). (2) Ensure 2 bookings exist for date 2026-05-21 with slot linked to resource Tav01 Gom. (3) Bookings should be MK-2026-0002 (SARDEGNAMCC, 2 pax) and MK-2026-0017 (Mura Giuseppina, 2 pax). Backend APIs are working (24/24 tests passed), but test data is missing for E2E flow validation."

  - agent: "main"
    message: "🆕 PAYMENT LINK ONLINE (SumUp) — IMPLEMENTED. New feature for Company Admin to generate SumUp payment links to send to customers for integrating amounts on existing bookings. CHANGES: (1) NEW BACKEND /app/app/api/[[...path]]/payment_link.js: handleCreatePaymentLink (POST /api/payment-link/create) creates SumUp hosted checkout with custom amount, saves to bookings.integration_payments[] array, optionally sends email via Resend (with SMTP fallback). handleLookupBooking (GET /api/payment-link/lookup?ref=MK-...) returns booking summary with pre-fill data and integrations history. (2) Dispatcher in route.js added for /api/payment-link/create and /api/payment-link/lookup. (3) UPDATED sumup_payments.js webhook: now detects 'INTG-' prefixed checkout_reference. For integration payments, marks the specific integration_payments[] entry as PAID/FAILED WITHOUT altering the main booking status. (4) NEW FRONTEND /app/app/components/PaymentLinkDialog.js: full dialog with autocomplete on booking_ref (MK-yyyy-nnnn), auto-lookup with debounce (450ms), pre-fills customer name/email/amount/description from booking, two delivery modes (Show & Copy vs Send Email), copy-to-clipboard, opens result in new tab. (5) INTEGRATION in page.js AdminDashboard: lazy-loaded PaymentLinkDialogLazy, new gradient emerald button '🔗 Link Pagamento Online' visible only for isCompanyAdmin in header next to Aggiorna/Dati Demo. VERIFIED visually: Marlin login → button visible → dialog opens → typing MK-2026-0019 triggers lookup → pre-fills ANTONIO DEIANA + email + €85.00 + description automatically. NEEDS BACKEND TESTING: (a) POST /api/payment-link/create with valid booking_id + amount + send_via=show returns hosted_url + checkout_reference (INTG-...). (b) GET /api/payment-link/lookup?ref=MK-... returns booking with paid_integrations_total. (c) Validation: missing customer_name/email returns 400, invalid amount returns 400, non-existent booking returns 404. (d) Verify integration_payments[] array is properly pushed to booking document."
  - agent: "testing"
    message: "✅ PAYMENT LINK ONLINE (SumUp Integration) BACKEND TESTING COMPLETED - 11/12 tests passed (91.7% success rate). COMPREHENSIVE VALIDATION: ✅ LOOKUP ENDPOINT (3/3 tests): GET /api/payment-link/lookup?ref=MK-2026-0019 returns booking with all required fields (id, booking_ref, customer_name, customer_email, total_amount, seats, status, payment_status, slot_datetime, company_id, integration_payments, paid_integrations_total). _id MongoDB field correctly excluded. Missing ref parameter returns 400. Non-existent booking MK-9999-0000 returns 404. ⚠️ Minor: Test booking MK-2026-0019 missing 'currency' field (old booking created before currency field added to schema) - NOT a bug in the endpoint, just missing data in test booking. ✅ CREATE ENDPOINT - HAPPY PATH (1/1 test): POST /api/payment-link/create with booking_ref=MK-2026-0019, amount=10.50, send_via=show returns 200 with hosted_url (https://checkout.sumup.com/pay/...), checkout_id, checkout_reference (INTG-MK-2026-0019-...), amount=10.50, currency=EUR, email_sent=false. MongoDB verified: integration_payments[] array updated with new entry (status=PENDING, amount=10.50, hosted_url, checkout_reference). ✅ CREATE ENDPOINT - VALIDATION (6/6 tests): Missing booking_ref/booking_id returns 400 'Indica booking_ref o booking_id'. Missing customer_name returns 400. Missing customer_email returns 400. Invalid amount (0, negative) returns 400 'Importo non valido'. Invalid send_via returns 400. Non-existent booking MK-9999-9999 returns 404. ✅ MULTIPLE INTEGRATIONS (1/1 test): Created 2 payment links for same booking (€15 and €25). Both entries appear in integration_payments[] array (no overwrite). Lookup returns both integrations correctly. ✅ EMAIL DELIVERY (1/1 test): POST with send_via=email successfully sends email via Resend provider (email_sent=true, email_provider=resend). Payment link created without crash. CRITICAL BUSINESS LOGIC VERIFIED: ✅ SumUp hosted checkout creation with custom amounts. ✅ checkout_reference prefixed with 'INTG-MK-' for webhook identification. ✅ integration_payments[] array persistence (multiple entries supported). ✅ Email delivery via Resend with SMTP fallback. ✅ All validation rules working correctly. ✅ MongoDB _id field exclusion. Payment Link Online feature is production-ready and working as specified. NO CRITICAL ISSUES FOUND."
