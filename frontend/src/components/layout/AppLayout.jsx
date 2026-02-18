import Sidebar from "./Sidebar";
import "../../styles/sidebar.css";

const AppLayout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
};

export default AppLayout;
