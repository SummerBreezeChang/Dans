<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Care demo architecture
- Keep synthetic records, persisted React context state, checklist generation, and notification preview triggers in `src/lib/careStore.ts`; the prototype must not access real medical records or send messages.
- Keep pure availability, workload-cap, decline, and reschedule algorithms in `src/lib/assignmentEngine.ts` so production adapters can replace the demo without UI rewrites.
- Build content views as independent TanStack routes under the shared care shell; use semantic tokens in the global stylesheet for consistent desktop and mobile presentation.
- Role switching is a prototype perspective control, not authentication; only primary caregivers edit the care plan, only patients control consent and wellness sharing, and refusal notes remain primary-only in the UI.
- Preserve caregiver IDs when renaming display identities and normalize persisted and synced text in the care context so assignments and SMS recipient mappings stay intact.
- Keep the care context object and consumer hook in a separate stable module from the provider so hot updates do not split provider and consumer identities.
- Live SMS goes only through server code that looks up recipients from the caregiver table, honours the Live/Demo setting, and dedupes via the SMS log with deterministic idempotency keys; inbound Linq webhooks must pass Standard Webhooks signature checks, to prevent spoofing, spam, and duplicate sends.
- Keep wellness scenario generation and privacy-aware detection in the pure wellness engine; real device connections must never be implied by synthetic readings.
- Wellness escalation uses deterministic board/activity IDs and an authenticated server function calling the protected SMS endpoint; daily recipient deduplication and generic demo-labelled texts prevent alert spam and disclosure of vitals.
