# Issues Tracker

## Status Legend:

- **Done** ✅ - Issue has been fixed and tested
- **In Progress** ⚠️ - Currently being worked on
- **Detected** ❌ - Issue detected, awaiting fix
- **Investigation** 🔍 - Issue needs further analysis
- **Won't Fix** 🚫 - Issue acknowledged but won't be addressed

---

## Summary Dashboard

| Status    | Count  | Percentage |
| --------- | ------ | ---------- |
| Done      | 10     | 83.33%     |
| Detected  | 2      | 16.67%     |
| **Total** | **12** | **100%**   |

---

## Issues by Category

### UI/UX Issues

| Component             | Priority | Issue Description                                                                                  | Status | Detected   | Fixed      |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------- |
| **Clipboard Screen**  | Low      | Empty clipboard state missing user feedback message                                                | ✅     | 2025/09/13 | 2025/09/13 |
| **ModalContext**      | Low      | When a snackbar is showing a message, you were not able to touch behind the parent of the snackbar | ✅     | 2025/09/16 | 2025/09/16 |
| **Clipboard Screen**  | Medium   | Large text is displayed out of its view                                                            | ✅     | 2025/09/16 | 2025/09/18 |
| **Streamers**         | Low      | Background/border color in streamer's image                                                        | ✅     | 2025/09/16 | 2025/09/18 |
| **DeviceInformation** | Medium   | Information container not properly centered on mobile                                              | ✅     | 2025/09/13 | 2025/09/18 |
| **Minesweeper Game**  | Medium   | Responsive design broken on mobile devices                                                         | ✅     | 2025/09/13 | 2025/09/18 |

### Theme & Design

| Component       | Priority | Issue Description                                                          | Status | Detected   | Fixed |
| --------------- | -------- | -------------------------------------------------------------------------- | ------ | ---------- | ----- |
| **Light Theme** | Medium   | Light mode color palette needs improvement for better contrast/readability | ❌     | 2025/09/13 | -     |

### Performance Issues

| Component         | Priority | Issue Description                                                        | Status | Detected   | Fixed      |
| ----------------- | -------- | ------------------------------------------------------------------------ | ------ | ---------- | ---------- |
| **InfoIP Screen** | High     | Significant FPS drops during data loading with SkeletonLoading component | ✅     | 2025/09/13 | 2025/09/18 |

### Backend/Server Issues

| Component                              | Priority | Issue Description                                                                                | Status | Detected   | Fixed      |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ | ------ | ---------- | ---------- |
| **Streamer Notifications**             | High     | Push notifications not sent when streamers go live - potential duplicate push tokens in database | ✅     | 2025/09/13 | 2025/09/18 |
| **Multi Sessions Not Available**       | High     | Multi sessions are not available, once the user logs in, old refresh_token will be invalidated   | ✅     | 2025/09/19 | 2025/09/20 |
| **Data across devices are not synced** | High     | When data in DB is updated in any device, remaining devices do not fetch last data               | ❌     | 2025/09/24 | -          |

### Functionality issues

| Component | Priority | Issue Description | Status | Detected | Fixed |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ | ------ | ---------- | ---------- |
| **WebSocketContext and NotificationsContext** | High | Clipboard sync was not working properly because WebSocketContext is under NotificationsContext, and NotificationsContext was using the default value of WebSocketContext | ✅ | 2025/12/07 | 2025/12/08 |

---

_Last Updated: 2025/09/18_  
_Total Issues: 12 | Resolved: 10 | Remaining: 2_
