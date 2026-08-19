import { addPropertyControls, ControlType } from "framer"

// 2 — Sizing annotations. Framer parses these comments.
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 */
// 3 — A NAMED export becomes its own item in the Assets panel.
export function Greeting(props) {
    const { name, tint, style } = props

    return (
        <section
            style={{
                // 4 — Spread Framer's style FIRST. It carries the size
                //     and position the designer set on the canvas.
                ...style,
                padding: 32,
                background: tint,
            }}
        >
            Hello, {name}
        </section>
    )
}

// 5a — Defaults, so it renders before anyone touches the panel.
Greeting.defaultProps = {
    name: "world",
    tint: "#6D3FEF",
}

// 5b — The knobs the designer is allowed to turn.
addPropertyControls(Greeting, {
    name: { type: ControlType.String, title: "Name" },
    tint: { type: ControlType.Color, title: "Tint" },
})
