#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from pprint import pprint

from .componenttree import ComponentNode, ComponentTree


class CompositionParser:
    def __init__(self, data: dict) -> None:

        self.__raw_data = data
        self.ctree = ComponentTree()

    def __copy_connections(self, element: dict) -> None:

        output_names = element["data"]["links"]["outputs"]
        output_conns = element["outputs"].values()
        links = []
        for output_name, output_conn in zip(output_names, output_conns):
            for conn in output_conn["connections"]:
                links.append(
                    {
                        "from_port": output_name,
                        "to_id": int(conn["node"]),
                        "to_port": element["data"]["links"]["inputs"][
                            int(conn["output"][-1]) - 1
                        ],
                    }
                )

        return links

    def filter(self) -> None:

        for module_name, module in self.__raw_data.items():

            self.ctree.add_module(module_name)

            for element_list in module.values():

                for element_ix, element in enumerate(element_list.values()):

                    # append a new CompressedNode object with CompressedNode.class_name
                    self.ctree.add_element(
                        module_name,
                        element["name"],
                        element_ix,
                        element["id"],
                        self.__copy_connections(element),
                    )

    def generate_tree(self):

        self.ctree.decompress()
        pprint(self.ctree.get_tree())
        pprint(self.ctree.get_leaves())

    def dump_raw_data(self):

        with open("out.json", "w") as dump_file:
            json.dump(self.__raw_data, dump_file, indent=4)

    # @staticmethod
    # def __get_name_by_id(links_list, node_id) -> str:

    #     for i in links_list:
    #         if i["id"] == node_id:
    #             return i["name"]

    # def convert_to_config(self):

    #     for element in self.processed_data:
    #         # print(element)
    #         for link in element["links"]:
    #             print(
    #                 f"""sst.Link('{link["from_port"]}_{element["id"]}').connect(
    #         ({element["name"]}, "{link["from_port"]}", LINK_DELAY),
    #         ({self.__get_name_by_id(self.processed_data, link["to_id"])}, "{link["to_port"]}", LINK_DELAY)
    #     )"""
    #             )

    #     pprint(self.processed_data)
