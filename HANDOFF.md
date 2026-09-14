# TimeGate — how it works, and what to watch

For the manager running it day to day. Nothing here needs any technical knowledge.

---

## What it does

Staff clock in and out with a **4-digit code** on any device that opens the punch
link — the tablet at the entrance, or their own phone. A normal day is four taps:

```
clock in  →  start break  →  end break  →  clock out
```

Breaks can be taken as often as needed. Tea and lunch are both just breaks.

---

## Two things to decide before you rely on it

### 1. Staff can clock in from anywhere

There is no check that someone is at the workplace. Anybody who has the punch link
and their own code can clock in from home, from the bus, from bed.

The old tablet-on-the-wall arrangement stopped that by being a physical object in a
physical place. This does not, and no amount of software will: a phone cannot prove
where it is without tracking where your staff are, which is a much bigger decision
than a timesheet.

**What you actually have instead:** every punch has a name on it and shows up on your
Records screen the same day. If someone's hours look wrong, you can see exactly when
they clocked in and ask about it. That is a management control, not a technical one —
worth being clear with the team that you can see it.

If this matters more than convenience, keep the punch link on the entrance tablet only
and do not send it to anyone.

### 2. Breaks are unpaid

Break time is subtracted from the hours you pay. A 09:00–17:00 day with a 15-minute
break pays **7 h 45 m**, not 8 hours.

This was confirmed as how you pay, and it is built in. If it is ever wrong, say so
before a payroll run rather than after — it changes every shift.

---

## Adding someone

On **Staff** → *Add a staff member*. You will see their code **once**. It cannot be
shown again, so send it before you close the panel. If it gets lost, issue a new one —
the old one stops working immediately.

Send them one message with both halves:

> Hi [name] — clock in and out here: [punch link]
> Your code is [1234]. Keep it to yourself.
> Save the link to your home screen and it is one tap from then on.

Codes are private. Two people sharing one means two people's hours under one name.

## When someone leaves

**Staff** → *Mark as left*. Their code stops working straight away.

Their existing hours are untouched. They still appear in that week's export, and they
still get paid for what they worked.

---

## Fixing a forgotten punch

People forget to clock out. It will happen in the first week.

Those shifts appear on **Records** marked **Needs review**, with **0:00** payable and a
banner above the table. The real times they *did* record are kept exactly as they are —
nothing is guessed.

Press **Fix**, enter the time that actually happened, and save. The totals update
immediately.

**Why zero and not an estimate:** the system will not invent a clock-out time, because
an invented time is an invented wage. Zero and a warning is a number you will notice.
A plausible guess is one you will not.

A reviewed shift stays in the CSV either way, at zero hours with its status showing, so
nobody is ever quietly paid short.

---

## Paying people

**Records** → pick the week with the arrows → **Export CSV**.

One row per shift, with the payroll reference so it can be matched to your payroll
system. Hours appear twice — as a decimal (`7.75`) and as hours and minutes (`7:45`) —
because different systems want different ones.

**Before you export, clear anything marked Needs review.** The banner tells you how
many. Exporting with them unresolved means those shifts pay zero.

Individual break times are on screen only, not in the CSV, so the file stays one row
per shift and can be checked by hand.

---

## Installing it on a phone or tablet

TimeGate installs like an app, so it opens full-screen with no address bar.

- **Android / Chrome:** open the punch link, then the menu → *Install app* (or
  *Add to Home screen*). Chrome may also offer it by itself after a moment.
- **iPhone / Safari:** open the punch link, tap the Share button, then
  *Add to Home Screen*.

It is the same app either way — installing only changes how it opens. Nothing is
downloaded from an app store and there is nothing to update by hand: it picks up
changes on its own.

## If the wifi drops

Once installed, the screen still opens without a connection — but it will say
**"No connection — clocking in and out is paused"** and the keypad will not accept
anything.

That is deliberate. It would be easy to let people tap away and save it up for later,
and that is exactly how the wrong times get recorded. Nothing is stored, so nothing is
stored wrong. Use pen and paper (below) and enter it afterwards.

---

## The tablet at the entrance

- Open the punch link and add it to the home screen.
- Turn on **screen pinning** (Android: Settings → Security → Screen pinning) so staff
  cannot wander off into other apps.
- Set the screen timeout long, and keep it on charge.

The punch link is deliberately long and unguessable. **Do not post it publicly** — it is
what keeps the 4-digit codes from being guessed by anyone who finds the site. Treat it
like a door key: fine to give to staff, not to put on a noticeboard.

---

## If it stops working

Wifi down, tablet flat, site unreachable — fall back to **pen and paper**. Write down
name, in, and out.

When it is back, add those shifts yourself through **Fix** on the Records screen. The
result is identical to if they had been tapped in at the time.

---

## Clock changes

The system handles the two nights a year when the clocks move.

A 22:00–06:00 night shift is **7 hours** in spring when the clocks go forward and
**9 hours** in autumn when they go back, and is paid that way, because that is how long
people were actually there. If you ever enter a time by hand that does not exist —
01:30 on the spring night — it will refuse it rather than move it quietly.

---

## If you decide to keep it

This is currently running on a personal account on free hosting. That is fine for
trying it out, and not where your payroll records should live long term.

Before it becomes the real system of record:

- Move the hosting and the database to a company-owned account.
- Decide how long you keep punch records, and who is allowed to see them.
- Tell staff in writing what is recorded and why — clock-in, clock-out and break times
  are personal data.

Ask whoever set it up to do the move; it is a short job, but it should happen before
this is the only record of anyone's hours.
