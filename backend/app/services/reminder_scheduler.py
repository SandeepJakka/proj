from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models_reminders import MedicineReminder
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

def send_due_reminders():
    """Called every minute to check and send due reminders."""
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        time_str = f"{now.hour:02d}:{now.minute:02d}"
        
        reminders = db.query(MedicineReminder).filter(
            MedicineReminder.is_active == True
        ).all()
        
        for reminder in reminders:
            times = json.loads(reminder.reminder_times) if isinstance(reminder.reminder_times, str) else reminder.reminder_times
            if time_str in times:
                # Get user email
                from app.db import models
                user = db.query(models.User).filter(
                    models.User.id == reminder.user_id
                ).first()
                if user and user.email:
                    from app.services.email_service import send_reminder_email
                    send_reminder_email(
                        to_email=user.email,
                        medicine_name=reminder.medicine_name,
                        dosage=reminder.dosage or "",
                        instructions=reminder.instructions or ""
                    )
                    logger.info(f"Sent reminder to {user.email} for {reminder.medicine_name}")
    except Exception as e:
        logger.error(f"Reminder scheduler error: {e}")
    finally:
        db.close()

def send_weekly_health_summary():
    """Send weekly health summary every Monday at 8 AM."""
    db: Session = SessionLocal()
    try:
        from app.db import models
        from datetime import timedelta
        
        users = db.query(models.User).filter(
            models.User.is_active == True,
            models.User.is_verified == True
        ).all()
        
        for user in users:
            if not user.email:
                continue
            
            # Get user's active reminders
            reminders = db.query(MedicineReminder).filter(
                MedicineReminder.user_id == user.id,
                MedicineReminder.is_active == True
            ).all()
            
            # Get report count this week
            week_ago = datetime.now() - timedelta(days=7)
            from app.db.models_reports import Report
            report_count = db.query(Report).filter(
                Report.user_id == user.id,
                Report.created_at >= week_ago
            ).count()
            
            # Send summary email
            from app.services.email_service import send_weekly_summary_email
            send_weekly_summary_email(
                to_email=user.email,
                user_name=user.full_name or user.email.split('@')[0],
                active_reminders=len(reminders),
                reports_this_week=report_count,
                reminder_list=[r.medicine_name for r in reminders]
            )
    except Exception as e:
        logger.error(f"Weekly summary error: {e}")
    finally:
        db.close()

def start_scheduler():
    """Start the reminder scheduler."""
    try:
        scheduler.add_job(
            func=send_due_reminders,
            trigger=CronTrigger(minute='*'),  # Run every minute
            id='medicine_reminders',
            replace_existing=True
        )
        scheduler.add_job(
            func=send_weekly_health_summary,
            trigger=CronTrigger(day_of_week='mon', hour=8, minute=0),
            id='weekly_summary',
            replace_existing=True
        )
        scheduler.start()
        logger.info("Reminder scheduler started")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

def stop_scheduler():
    try:
        scheduler.shutdown()
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {e}")
