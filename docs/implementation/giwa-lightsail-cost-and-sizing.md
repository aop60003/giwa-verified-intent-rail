# GIWA Lightsail Cost and Sizing

## Scope

This document gives a Sprint 51 cost and sizing model for a future Lightsail staging environment. It is not a purchase order, not a deployment approval, and not a claim that hosting is free.

Final pricing must be confirmed by the operator in the AWS console for the selected region, account, billing currency, public IPv4 requirement, data transfer profile, load balancer choice, snapshots, and any managed database or storage option.

Official AWS references used for this planning model:

- AWS Lightsail pricing: https://aws.amazon.com/lightsail/pricing/
- Lightsail load balancer feature pricing page: https://aws.amazon.com/lightsail/features/load-balancing/
- Lightsail FAQ pricing notes: https://aws.amazon.com/lightsail/faq/
- Lightsail billing FAQ for snapshots: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html
- Lightsail snapshots documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-snapshots-in-amazon-lightsail.html

## Cost Components

| Component | Why it matters | Sprint 51 decision |
| --- | --- | --- |
| Lightsail instance bundle | Main compute, memory, disk, and transfer allowance | Required for any staging host. |
| Public IPv4 or IPv6-only choice | Public IPv4 can affect available bundle pricing and network posture | Operator must choose during Sprint 52 preflight. |
| Load balancer | Simplifies certificate and future multi-instance routing | Optional for first staging; required if chosen for managed HTTPS. |
| Snapshots | Backup and rollback evidence | Required before partner-facing staging. |
| Additional block storage | May be needed if snapshots, logs, or DB grow | Not required for minimum dry run unless DB/log size requires it. |
| Managed database | Durable storage alternative | Blocked until managed infrastructure approval. |
| Data transfer overage | Public traffic can exceed included transfer | Monitor and budget before partner review. |
| Domain and certificate operations | Needed for real staging URL | Approval required before DNS/HTTPS work. |
| Logs and monitoring | Operational visibility | Start with journald; hosted log sink needs approval. |

## Current AWS Price Signals

Use these only as planning inputs. The operator must confirm current numbers in AWS before approval.

- AWS Lightsail FAQ states Linux/Unix plans start at an hourly rate with a monthly cap, with the least expensive plan starting at `$0.0047 USD/hour` and `$3.50 USD/month`.
- AWS Lightsail public pricing notes that standard plans include a data transfer allowance and overage charges vary by AWS Region.
- AWS Lightsail load balancer page lists a `$18 USD/month` Lightsail load balancer price.
- AWS Lightsail billing FAQ states manual and automatic snapshots are charged at `$0.05 USD/GB-month`.

## Sizing Candidates

| Candidate | Intended use | Suggested shape | Approval posture |
| --- | --- | --- | --- |
| Minimum staging | One operator, short review windows, static plus one live Node service | Small Linux/Ubuntu instance, Nginx, static/live Node services, local SQLite only if explicitly accepted | Cheapest useful dry-run candidate; not partner beta by itself. |
| Beta staging | Reviewer or partner walkthrough with live API and rollback owner | Larger Linux/Ubuntu instance or load balancer, snapshots, backup/restore drill, exact origin policy, durable storage decision | Requires external hosting approval, partner/customer signoff, and storage/restore gate. |
| Production candidate | Future managed testnet partner pilot | Load balancer or managed edge, durable storage adapter, managed credential store, observability sink, backup/restore automation | Out of Sprint 51 scope; requires later architecture and approval. |

## Cost Decision Rules

Minimum staging may use:

- one Ubuntu Lightsail instance
- one static service
- one live service
- Nginx reverse proxy
- local disk state only if the rehearsal explicitly accepts single-instance limitations
- manual snapshot before and after rehearsal

Beta staging should add:

- approved HTTPS method
- snapshot retention plan
- backup/restore drill
- durable storage decision
- log retention decision
- partner review window and traffic estimate

Production candidate must not be inferred from staging. It needs a separate managed infrastructure design.

## Cost Risks

| Risk | Control |
| --- | --- |
| Assuming a trial or free tier applies | Require AWS console confirmation in the target account. |
| Under-sizing memory for live verifier paths | Start with staging smoke, monitor memory and process restarts, resize before partner beta. |
| Snapshot retention surprise | Record disk size, snapshot count, retention days, and owner. |
| Load balancer cost surprise | Choose between direct Nginx/certbot and Lightsail load balancer before DNS work. |
| Data transfer overage | Keep staging traffic bounded and monitor transfer before external partner review. |
| Local SQLite loss | Snapshot before review and run restore drill; do not treat local disk as durable beta storage. |
| Credential management ad hoc cost | Require approved injection or managed credential store before public binding. |

## Cost Approval Checklist

Before Sprint 52 can execute a deploy preflight, record:

- AWS account and billing approval
- target region
- selected instance bundle
- public IPv4 or IPv6-only decision
- load balancer yes/no decision
- HTTPS method
- snapshot policy and retention period
- storage mode
- expected review traffic
- monthly budget owner
- stop condition if spend exceeds budget

## Recommendation

For the first staging dry-run plan, start with the minimum single-instance Ubuntu Lightsail design and Nginx same-origin routing. Add a Lightsail load balancer only if certificate lifecycle, reviewer access, or future multi-instance routing justifies the extra component and cost.

Do not move to beta staging until protected CI or an approved exception, partner/customer signoff, backup/restore drill, storage owner, and rollback owner are recorded.
