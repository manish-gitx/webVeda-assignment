import { addPropertyControls, ControlType } from "framer"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 */
export function Greeting({ name = "world", tint = "#FF0000", style }) {
    return (
        <section
            style={{
                ...style,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tint,
                color: "white",
                fontSize: 48,
            }}
        >
            Hello, {name}
        </section>
    )
}

addPropertyControls(Greeting, {
    name: { type: ControlType.String, title: "Name", defaultValue: "world" },
    tint: { type: ControlType.Color, title: "Tint", defaultValue: "#FF0000" },
})