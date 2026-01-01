"""
Routes per CheckDB - Monitoraggio database MongoDB
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db, client
from auth import verify_trivordoc_credentials

router = APIRouter(prefix="/checkdb", tags=["CheckDB"])

# =============================================================================
# DATABASE MONITORING
# =============================================================================

@router.get("/databases")
async def get_all_databases(username: str = Depends(verify_trivordoc_credentials)):
    """Get list of all databases in the cluster"""
    try:
        db_list = await client.list_database_names()
        databases = []
        
        for db_name in db_list:
            if db_name not in ["admin", "local", "config"]:
                try:
                    target_db = client[db_name]
                    db_stats = await target_db.command("dbStats")
                    databases.append({
                        "name": db_name,
                        "sizeOnDisk": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                        "empty": db_stats.get("objects", 0) == 0
                    })
                except Exception:
                    databases.append({
                        "name": db_name,
                        "sizeOnDisk": 0,
                        "empty": True
                    })
        
        return {
            "databases": sorted(databases, key=lambda x: x["name"]),
            "count": len(databases)
        }
    except Exception as e:
        return {"error": str(e), "databases": [], "count": 0}

@router.get("/database/{db_name}/status")
async def get_specific_db_status(db_name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get status for a specific database"""
    try:
        target_db = client[db_name]
        db_stats = await target_db.command("dbStats")
        collections = await target_db.list_collection_names()
        
        collection_stats = []
        for coll_name in collections:
            try:
                coll_stats = await target_db.command("collStats", coll_name)
                collection_stats.append({
                    "name": coll_name,
                    "count": coll_stats.get("count", 0),
                    "size": coll_stats.get("size", 0),
                    "avgObjSize": coll_stats.get("avgObjSize", 0),
                    "storageSize": coll_stats.get("storageSize", 0),
                    "totalIndexSize": coll_stats.get("totalIndexSize", 0),
                    "nindexes": coll_stats.get("nindexes", 0),
                })
            except Exception as e:
                collection_stats.append({
                    "name": coll_name,
                    "count": await target_db[coll_name].count_documents({}),
                    "size": 0,
                    "error": str(e)
                })
        
        collection_stats.sort(key=lambda x: x.get("size", 0), reverse=True)
        
        return {
            "database": {
                "name": db_name,
                "collections": len(collections),
                "dataSize": db_stats.get("dataSize", 0),
                "storageSize": db_stats.get("storageSize", 0),
                "indexSize": db_stats.get("indexSize", 0),
                "totalSize": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                "objects": db_stats.get("objects", 0),
                "avgObjSize": db_stats.get("avgObjSize", 0),
            },
            "collections": collection_stats,
        }
    except Exception as e:
        return {"error": str(e), "database": {"name": db_name}, "collections": []}

@router.get("/status")
async def get_db_status(username: str = Depends(verify_trivordoc_credentials)):
    """Get comprehensive database status and statistics"""
    try:
        db_stats = await db.command("dbStats")
        collections = await db.list_collection_names()
        
        collection_stats = []
        for coll_name in collections:
            try:
                coll_stats = await db.command("collStats", coll_name)
                collection_stats.append({
                    "name": coll_name,
                    "count": coll_stats.get("count", 0),
                    "size": coll_stats.get("size", 0),
                    "avgObjSize": coll_stats.get("avgObjSize", 0),
                    "storageSize": coll_stats.get("storageSize", 0),
                    "totalIndexSize": coll_stats.get("totalIndexSize", 0),
                    "nindexes": coll_stats.get("nindexes", 0),
                })
            except Exception as e:
                collection_stats.append({
                    "name": coll_name,
                    "count": await db[coll_name].count_documents({}),
                    "size": 0,
                    "error": str(e)
                })
        
        collection_stats.sort(key=lambda x: x.get("size", 0), reverse=True)
        
        return {
            "database": {
                "name": db.name,
                "collections": len(collections),
                "dataSize": db_stats.get("dataSize", 0),
                "storageSize": db_stats.get("storageSize", 0),
                "indexSize": db_stats.get("indexSize", 0),
                "totalSize": db_stats.get("dataSize", 0) + db_stats.get("indexSize", 0),
                "objects": db_stats.get("objects", 0),
                "avgObjSize": db_stats.get("avgObjSize", 0),
            },
            "collections": collection_stats,
            "server_info": {
                "ok": db_stats.get("ok", 0),
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "database": {"name": db.name},
            "collections": []
        }

@router.get("/collections/{collection_name}")
async def get_collection_details(collection_name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get detailed info about a specific collection"""
    try:
        samples = await db[collection_name].find({}, {"_id": 0}).limit(5).to_list(5)
        count = await db[collection_name].count_documents({})
        
        indexes = []
        async for idx in db[collection_name].list_indexes():
            indexes.append({
                "name": idx.get("name"),
                "key": dict(idx.get("key", {})),
                "unique": idx.get("unique", False)
            })
        
        return {
            "name": collection_name,
            "count": count,
            "indexes": indexes,
            "sample_documents": samples,
            "fields": list(samples[0].keys()) if samples else []
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/health")
async def get_db_health(username: str = Depends(verify_trivordoc_credentials)):
    """Quick health check of database connection"""
    try:
        await client.admin.command('ping')
        server_info = await client.server_info()
        
        return {
            "status": "healthy",
            "connected": True,
            "server_version": server_info.get("version", "unknown"),
            "database": db.name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
