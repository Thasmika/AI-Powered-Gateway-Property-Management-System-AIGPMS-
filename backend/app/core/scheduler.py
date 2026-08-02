from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

from app.services.alert_engine import run_alert_engine

logger = logging.getLogger(__name__)

# Start background scheduler
scheduler = BackgroundScheduler()

def start_scheduler():
    """Initializes and starts the APScheduler"""
    # Run every day at 1:00 AM
    scheduler.add_job(
        run_alert_engine, 
        trigger=CronTrigger(hour=1, minute=0), 
        id="daily_pdc_alert_job",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Background scheduler started")
