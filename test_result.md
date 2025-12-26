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

user_problem_statement: "Implementazione 6 modifiche P0: 1) icone colorate header, 2) date formato gg.mm.aaaa, 3) aggiornamento stato ticket, 4) calendario data corrente, 5) costo manutenzione input libero, 6) ticket automatico da manutenzione"

backend:
  - task: "Creazione automatica ticket da manutenzione"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Aggiunto campo crea_ticket_automatico a ManutenzioneCreate e logica in create_manutenzione endpoint"

  - task: "API aggiornamento stato ticket"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "API PUT /api/tickets/{id} già esistente e funzionante, testato via curl"

frontend:
  - task: "Icone colorate header navigazione"
    implemented: true
    working: true
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Aggiunto oggetto tabColors con colori specifici per ogni tab (cyan, blue, yellow, purple, green, orange, indigo, pink, amber, red, teal)"

  - task: "Formattazione date gg.mm.aaaa"
    implemented: true
    working: true
    file: "frontend/src/TicketCalendarQR.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Funzione formatDateIT già esistente, importata in App.js e SmartBuildingDashboard.js e applicata alle date visualizzate"

  - task: "Modale aggiornamento stato ticket"
    implemented: true
    working: true
    file: "frontend/src/TicketCalendarQR.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "AggiornaTicketDialog già esistente, collegato in TicketList con nuovo pulsante Aggiorna e handler handleAggiornaTicket"

  - task: "Campo costo manutenzione input libero"
    implemented: true
    working: true
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Modificato campo costo da type=number a type=text con parsing intelligente che accetta numeri e testo"

  - task: "Checkbox creazione ticket automatico in form manutenzione"
    implemented: true
    working: true
    file: "frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
        - agent: "main"
        - comment: "Aggiunto campo crea_ticket_automatico al formData e checkbox visibile solo quando si crea nuova manutenzione con elettrodomestico selezionato"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Verifica icone colorate header"
    - "Verifica aggiornamento stato ticket"
    - "Verifica creazione ticket automatico"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
    - message: "Completate tutte le 6 modifiche P0. Backend testato via curl, frontend verificato via screenshot. Le icone colorate sono visibili nell'header. Il file commesse.md è stato aggiornato con smartdomo-central."
    - agent: "main"
    - message: "MIGRAZIONE DATI COMPLETATA: Migrati stati vecchi di manutenzioni (pianificata->aperto, completata->completato) e tickets (risolto->completato). Totale 11 record aggiornati. API /api/tickets e /api/manutenzioni funzionanti. Sidebar ora mostra correttamente Manutenzioni (8)."