#!/usr/bin/env python3
"""
This file has the ImageHandler, it gets request for images and returns images.
"""

import logging
import json
import tornado.web
from tornado.httpclient import HTTPResponse
from tornado.httputil import HTTPHeaders
from imageutils import (merge_channels,
                        get_thumb_path)


from dbqueries import list_plate


class ImageListHandler(tornado.web.RequestHandler): #pylint: disable=abstract-method
    """
    The image list handler returns lists of image names
    """
    def get(self, plate):
        """Handles GET requests.
        """
        logging.info("plate: " + str(plate))

        result = list_plate(plate)

        self.finish({'data':result})

class ImageMergeHandler(tornado.web.RequestHandler): #pylint: disable=abstract-method
    """
    The image handler returns actual images
    """
    def get(self, json_string):
        """Handles GET requests.
        """

        logging.debug("Hello")


        channels = json.loads(json_string)

        # rewrite paths to thumbs
        for (key, value) in channels.items():
            new_value = "/share/imagedb/thumbs/" + str(value).strip(".tif") + ".png"
            channels.update({key: new_value})

        logging.debug(channels)

        img_path = None
        if len(channels) == 1:
            img_path = channels['1']
        else:
            img_path = merge_channels(channels, "share/imagedb/image-cache/")


        logging.debug(img_path)

        self.write(open(img_path, 'rb').read())

        #self.write({'results': 'nothing here says anders again'})


class ImageMergeHandlerGetURL(tornado.web.RequestHandler): #pylint: disable=abstract-method
    """
    The query handler handles form posts and returns a list of hits.
    """
    def post(self):
        """Handles POST requests.
        """
        logging.info("Hej")
        logging.info(self.request)
        logging.info(tornado.escape.json_decode(self.request.body))
        try:
            form_data = self.request.body_arguments

        except Exception as e:
            logging.error("Exception: %s", e)
            form_data = []

        logging.info("Hej")
        logging.info("form_data:" + str(form_data))


        self.finish({'results':'nothing here says anderd'})



class ImageHandler(tornado.web.RequestHandler): #pylint: disable=abstract-method
    """
    The image handler returns actual images
    """
    def get(self, image):
        """Handles GET requests.
        """
        import random
        images = ['red.png', 'blue.png', 'green.png']

        selected_image = images[random.randint(0, len(images)-1)]

        self.write(open(selected_image, 'rb').read())