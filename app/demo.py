import json

from flask import Blueprint, render_template

from .boilerplate.html import (
    DEMO_COMPONENTS,
    DF_BOX_DIVS,
    ELEMENT_DIV,
    INPUT_TAG,
    NODE_INPUT_STYLE,
    NODE_OUTPUT_STYLE,
)


def __generate_drawflow(element_divs, df_box_divs, node_styles) -> tuple:

    for element in DEMO_COMPONENTS:
        input_tags = ""
        element_name = element["name"]

        for param in element["param"].keys():
            input_tags += INPUT_TAG.format(key=param)
        df_box_divs[element_name] = {}
        df_box_divs[element_name]["html"] = DF_BOX_DIVS.format(
            element=element_name, desc=element["desc"], input_tag=input_tags
        )
        df_box_divs[element_name]["links"] = element["links"]
        df_box_divs[element_name]["param"] = element["param"]
        node_styles += "\n".join(
            NODE_INPUT_STYLE.format(class_name=element_name, index=i + 1, value=j)
            for i, j in enumerate(element["links"]["inputs"])
        )
        node_styles += "\n".join(
            NODE_OUTPUT_STYLE.format(class_name=element_name, index=i + 1, value=j)
            for i, j in enumerate(element["links"]["outputs"])
        )

        element_divs += ELEMENT_DIV.format(element_name)

    return (
        element_divs,
        df_box_divs,
        node_styles,
    )


demo_bp = Blueprint("demo_bp", __name__)


@demo_bp.route("/demo")
def demo() -> str:

    element_divs = ""
    node_styles = ""
    df_box_divs = {}
    imported_drawflow = {}

    from . import demo

    (element_divs, df_box_divs, node_styles) = __generate_drawflow(
        element_divs, df_box_divs, node_styles
    )

    return render_template(
        "canvas.html",
        element_divs=element_divs,
        df_box_divs=json.dumps(df_box_divs),
        node_styles=node_styles,
        imported_drawflow=imported_drawflow,
    )