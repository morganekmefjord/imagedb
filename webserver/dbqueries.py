#!/usr/bin/env python3
import logging
import json
import psycopg2
from psycopg2 import pool
import settings as imgdb_settings

__connection_pool = None


def get_connection():

    global __connection_pool
    if __connection_pool is None:
        __connection_pool = psycopg2.pool.SimpleConnectionPool(1, 20, user = imgdb_settings.DB_USER,
                                              password = imgdb_settings.DB_PASS,
                                              host = imgdb_settings.DB_HOSTNAME,
                                              port = imgdb_settings.DB_PORT,
                                              database = imgdb_settings.DB_NAME)

    return __connection_pool.getconn()


def put_connection(pooled_connection):

    global __connection_pool
    if __connection_pool:
        __connection_pool.putconn(pooled_connection)


def list_plate(find_plate):
    logging.debug("list_plates")

    logging.debug("find_plate" + find_plate)

    conn = None
    try:

        conn = get_connection()

        return_cols = ['plate',
                       'project',
                       'timepoint',
                       'path',
                       'well',
                       'site',
                       'channel'
                       ]

        query = ("SELECT " + ",".join(return_cols) +
                 " FROM images"
                 " WHERE plate = %s"
                 " ORDER BY well, site, channel")

        logging.info("query" + query)

        cursor = conn.cursor()
        cursor.execute(query, (find_plate, ))

        # create a list with all results as key-values
#        resultlist = []
#        for row in cursor:
#            for value, col_name in zip(row, return_cols):
#                resultlist.append({col_name, value})

        resultlist = [dict(zip([key[0] for key in cursor.description], row)) for row in cursor]

        logging.info(str(resultlist))

        cursor.close()
        put_connection(conn)
        conn = None

        # Before returning (to web) delete the for user hidden "root part" IMAGES_ROOT_FOLDER part, e.g. /share/mikro/IMX.....
        for image in resultlist:
            for key, value in image.items():
                if key == "path":
                    new_value = str(value).replace( imgdb_settings.IMAGES_ROOT_FOLDER , "")
                    image.update( {'path': new_value})

        # create a nested json object of all images.
        # A plate object containing all timepoints. The timpoints containing all wells and then all sites
        # and then channels with image path
        plates_dict = {}
        for image in resultlist:
            plates_dict.setdefault(image['plate'], {}) \
                .setdefault(image['timepoint'], {}) \
                .setdefault(image['well'], {}) \
                .setdefault(image['site'], {}) \
                .setdefault(image['channel'], image['path'])

        return {'plates': plates_dict}

    except (Exception, psycopg2.DatabaseError) as error:
        logging.exception("Message")
    finally:
        if conn is not None:
            put_connection(conn)

def list_plates():

    logging.debug("list_plates")

    conn = None
    try:

        conn = get_connection()

        query = ("SELECT DISTINCT plate, project "
                 "FROM images "
                 "ORDER BY project, plate")

        logging.info("query" + str(query))

        cursor = conn.cursor()
        cursor.execute(query)

        resultlist = []

        for row in cursor:
            resultlist.append({'plate': row[0],
                               'project': row[1]
                               })

        # resultlist = [dict(zip([key[0] for key in cursor.description], row)) for row in result]

        cursor.close()
        put_connection(conn)
        conn = None

        logging.debug(json.dumps(resultlist, indent=2))

        return resultlist


    except (Exception, psycopg2.DatabaseError) as error:
        logging.exception("Message")
    finally:
        if conn is not None:
            put_connection(conn)