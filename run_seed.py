"""
臨時用：清空 DB 並以新測資重新填充
執行：python run_seed.py（在 HandOff 目錄下）
"""
import os
import sys

# 確保 models 可被 seed_data.py import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, r"C:\Users\tatami\Downloads\seed_data")

from app import create_app
from models import db

app = create_app()

with app.app_context():
    print("清空所有資料表...")
    db.drop_all()
    db.create_all()
    print("資料表重建完成，開始填充測資...")

    from seed_data import seed
    seed()
    print("測資填充完成！")
