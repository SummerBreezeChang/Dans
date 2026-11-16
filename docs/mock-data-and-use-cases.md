# Dans mock data: people, roles, one week, and scenarios

For thinking and exploring. The names, the week and the availability match what is in the Dans app today. Relationships, constraints and phone numbers are invented and marked so. All phone numbers are fake (555).

## The three roles

| Role | Who | Sees | Can do | Hears by text |
|---|---|---|---|---|
| Patient | Maya Lin | Everything about herself. Who is doing what. | Give or stop consent for the hospital record. Decide who sees medical details. | One line when plans change. Not every back and forth. |
| Main caregiver | Summer Chang | Full medical details, all tasks, everyone's load. | Set up the circle, connect the hospital, edit the checklist, change a visit, assign, invite. | When a task has nobody. When a helper says no. |
| Helper | Henry, Nancy, Jack, Mary, Karen | Tasks only: "ride on Thursday". Never the diagnosis unless Maya shares it. | Say yes, swap or can't. Set free times and a weekly limit. | Only their own tasks: assigned, moved, reminder. |

## The patient

| Field | Value |
|---|---|
| Name | Maya Lin |
| Condition | Stage II breast cancer |
| Treatment now | Chemotherapy every two weeks |
| Next phases | Surgery, then recovery and follow-up |
| Hospital | Kaiser Permanente (simulated) |
| Medicines | Ondansetron, Dexamethasone |
| Phone (fake) | (415) 555-0100 |

## The circle

Days are free times. M = morning, A = afternoon, E = evening.

| Person | Role | Relationship (invented) | Sees | Weekly limit | Free times | Constraint (invented) | Phone (fake) |
|---|---|---|---|---|---|---|---|
| Summer Chang | Main caregiver | Close friend | Full medical details | 5 | Mon M E, Tue M E, Wed M E, Thu M E, Fri E, Sat M A, Sun M | Works Friday days | (415) 555-0101 |
| Henry | Helper | Maya's brother | Tasks only | 5 | Mon A, Tue A, Wed M A, Thu A, Fri A E, Sat E, Sun A | Has a car | (415) 555-0142 |
| Nancy | Helper | Neighbor | Tasks only | 5 | Mon E, Tue M, Wed E, Thu M A E, Fri M A, Sat M, Sun E | Two minutes away, has a car | (510) 555-0178 |
| Jack | Helper | Coworker | Tasks only | 5 | Tue E, Thu E, Sat M A, Sun M A | Maya has not told work the diagnosis | (415) 555-0116 |
| Mary | Helper | Maya's mother | Tasks only | 5 | Mon M, Wed M, Fri M A E | Does not drive. Cooks. | (510) 555-0193 |
| Karen | Helper | Friend, lives an hour away | Tasks only | 5 | Tue A, Thu A, Sat E, Sun E | Too far for rides. Phone check-ins and meal delivery. | (415) 555-0127 |

## The week: November 16 to 22

### Visits (from the hospital record)

| Day | Visit | Time | Length | Place |
|---|---|---|---|---|
| Wed 18 | Lab blood draw | 8:30 AM | 30 min | Kaiser laboratory, 2nd floor |
| Thu 19 | Chemotherapy infusion | 10:00 AM | 3 hours | Kaiser infusion center |
| Mon 23 | Oncology follow-up | 11:00 AM | 45 min | Kaiser oncology clinic |

### Tasks

| # | Task | Day and time | Linked visit | Owner | Status |
|---|---|---|---|---|---|
| 1 | Ride to chemotherapy | Thu 9:00 AM | Chemo | Summer | Accepted |
| 2 | Prepare a post-chemo meal | Thu 6:00 PM | Chemo | Henry | Assigned, not yet accepted |
| 3 | Pick up prescriptions | Thu 12:30 PM | Chemo | Nobody | Needs someone |
| 4 | Ride to blood draw | Wed 7:45 AM | Labs | Henry | Accepted |
| 5 | Confirm oncology follow-up | Mon 10:00 AM | None | Summer | Done |
| 6 | Check in with Maya | Fri 7:00 PM | None | Nancy | Assigned |
| 7 | Prepare meals for the weekend | Sat 11:00 AM | None | Nobody | Needs someone |
| 8 | Collect questions for the oncologist | Wed 6:00 PM | Oncology | Summer | Assigned |
| 9 | Update emergency contact list | Tue 10:00 AM | None | Nancy | Done |
| 10 | Set up a comfortable recovery space | Thu 8:00 AM | None | Nobody | Needs someone |

Load at the start: Summer 3, Henry 2, Nancy 2, Jack 0, Mary 0, Karen 0. Three tasks need someone.

One thing already off in this data: Henry holds the Thursday evening meal but is not free Thursday evening.

## How to think about use cases

Every use case is one sentence with four parts:

**Who** is acting, at what **moment**, through which **channel**, to get what **outcome**.

- **Who:** Maya (patient), Summer (main caregiver), a helper.
- **Moment:** setting up, a normal week, something changes, afterwards.
- **Channel:** the app on a laptop, the app on a phone, a text message, nothing at all (it happens for them).
- **Outcome:** what is true for them when it is done, in their words.

A use case is ready to design when you can also answer: what is the least this person has to do, and what happens if they do nothing?

### Use case map

| Moment | Maya (patient) | Summer (main caregiver) | A helper |
|---|---|---|---|
| **Setting up** | Says yes to sharing her record. Chooses who sees medical details. Channel: beside Summer, on the laptop. | Creates the circle, connects the hospital, reviews the checklist, invites people. Channel: laptop. About ten minutes. | Gets an invite by text, sets free times and a weekly limit. Channel: phone. Under a minute. |
| **A normal week** | Sees who is coming and when. Does not manage anything. Channel: phone, glance only. | Sees what is covered and the one thing that is not. Asks someone or takes it. Channel: laptop or phone. | Gets an ask, replies yes, swap or can't. Gets a reminder. Does the task. Channel: text. The app is optional. |
| **Something changes** | Is told once, in one line. Channel: text. | Changes the visit once, or it comes in from the hospital. Hears only if nobody can cover. Channel: laptop, then text. | Hears only what changed for them. Confirms or hands it back. Channel: text. |
| **Afterwards** | Sees that the week happened and who helped. | Sees the week closed, who carried what, who has room next week. | Gets a thank-you. Sees they are done. |

### How each person uses it, in one line

- **Maya** mostly does not use it. It runs for her. Her only decisions are consent and privacy.
- **Summer** uses the app. She sets it up once on a laptop, then checks one screen: is the week covered?
- **Helpers** mostly use text. Yes, swap or can't. They open the app only to set free times or see their week.

### Checks for any new use case

1. Can a helper finish it without opening the app?
2. Does Maya have to do anything? If so, can it be removed?
3. Does a text reveal anything medical to someone on tasks only?
4. If the person does nothing, does the task still end up with someone, or with Summer?
5. Does Summer hear about it only when she is needed?

## Scenarios to explore

Each one names the trigger, who is affected, and the question it raises.

### 1. The visit moves (the core demo)
Chemo moves from Thursday 10:00 AM to Friday 2:00 PM.
- Task 1, the ride, becomes Friday 1:00 PM. Summer is not free Friday afternoon. Free then: Henry, Nancy, Mary. Mary does not drive.
- Task 2, the meal, becomes Friday 6:00 PM. Henry is free. It stays his, and he gets a "plans changed" text.
- Task 3, prescriptions, becomes Friday 4:30 PM. Still nobody.
- Question: should Summer, as main caregiver, be asked before her own ride is given away?

### 2. A helper says "can't make it"
Henry replies "can't make it" to the Wednesday 7:45 AM ride to the blood draw.
- Free Wednesday morning: Summer, Mary. Mary does not drive. Summer already has 3.
- Question: does the app know a ride needs a driver, or does it only match free time?

### 3. Nobody fits
Task 10, the recovery space, Thursday 8:00 AM. Free Thursday morning: Summer, Nancy.
- If both say no, nobody is left.
- Question: what does Summer see and hear, and how long before the task is dropped or moved?

### 4. Someone is at their limit
Nancy lowers her weekly limit to 2. She already has 2.
- Question: does auto-assign skip her quietly, and does Summer see why?

### 5. Privacy at work
Jack is a coworker and Maya has not told work.
- A text that says "Ride to chemotherapy" tells him the diagnosis.
- Question: should task names be plain ("a ride for Maya, Thursday 9:00 AM") for anyone on tasks only?

### 6. The right task for the right person
Mary does not drive, Karen lives an hour away.
- Question: do people need "what I can help with" (rides, meals, check-ins, pickups) as well as free times?

### 7. A new helper joins midweek
Karen joins on Wednesday. Three tasks still need someone.
- Question: is she asked straight away, or does she set free times first?

### 8. Maya has a bad night
The wellness reading shows poor sleep for several days. A "check in on Maya" task appears.
- Question: who gets it, and should Maya approve it before the circle hears?

### 9. Two changes in one day
Chemo moves to Friday, then two hours later moves again to Saturday 9:00 AM.
- Question: how many texts does Henry get, and does the second one make the first one clear?

### 10. The main caregiver is out
Summer is sick for the week. She owns 3 tasks and all the decisions.
- Question: is there a backup main caregiver, and can Maya choose one?

### 11. Maya changes her mind
Maya turns off sharing with the hospital on Tuesday.
- Question: what happens to the visits and tasks that came from the record?

### 12. A helper wants to swap
Nancy can't do Friday 7:00 PM but could do Saturday morning. Task 7 is Saturday 11:00 AM and has nobody.
- Question: is a swap between a person's task and an open task one step or two?
