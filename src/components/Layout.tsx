import { Page } from "@geist-ui/core";
import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function Layout({children}: {children: ReactNode}) {
    return (
        <div>
            <Navbar />
            <div style={{ marginTop: 55 }}>
                {children}
            </div>
        </div>
    )
}