import { NavLink } from 'react-router-dom'
import { useAuth } from '../Auth/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faArrowRightToBracket, faHome, faTableColumns, faTableList, faDatabase } from '@fortawesome/free-solid-svg-icons'
import iotxLogo from '/iotx_blue.svg'
// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap Bundle JS
import "bootstrap/dist/js/bootstrap.bundle.min";

function Navbar() {

    const { auth, user } = useAuth();
    var myUser = "empty";

    if (user)
        if (user.data)
            if (user.data.User)
                myUser = user.data.User.Username;

    return (
        <>
            <div className='d-flex rounded justify-content-between' style={{ backgroundColor: '#111111', paddingLeft: '5px', paddingRight: '5px' }}>
                <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                    <div className="container-fluid">
                        <NavLink to="/" className="navbar-brand"><img src={iotxLogo} alt="iotx logo" height={'40px'} /></NavLink>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarNav">
                            <ul className="navbar-nav">
                                <li className="nav-item">
                                    <NavLink to="/" className="nav-link"><FontAwesomeIcon icon={faHome} /><span style={{ paddingLeft: '4px' }}>Home</span></NavLink>
                                </li>
                                {auth && (
                                    <>
                                        <li className="nav-item">
                                            <NavLink to="/dashboard" className="nav-link"><FontAwesomeIcon icon={faTableColumns} /><span style={{ paddingLeft: '4px' }}>Dashboard</span></NavLink>
                                        </li>
                                        <li className="nav-item" style={{ display: 'none' }}>
                                            <NavLink to="/testdb" className="nav-link"><FontAwesomeIcon icon={faDatabase} /><span style={{ paddingLeft: '4px' }}>Testdb</span></NavLink>
                                        </li>
                                        <li className="nav-item">
                                            <NavLink to="/testmqtt" className="nav-link"><FontAwesomeIcon icon={faTableList} /><span style={{ paddingLeft: '4px' }}>Device List</span></NavLink>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </nav>
                <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                    <div className="container-fluid">
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarRight" aria-controls="navbarRight" aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarRight">
                            <ul className="navbar-nav">
                                {auth ? (
                                    <>
                                        <li className="dropdown">
                                            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <FontAwesomeIcon icon={faUser} /><span style={{ paddingLeft: '4px' }}>{myUser}</span>
                                            </a>
                                            <ul className="dropdown-menu dropdown-menu-dark">
                                                <li><a className="dropdown-item" href="#">Profile</a></li>
                                                <li><NavLink to="/logout" className="dropdown-item">Logout</NavLink></li>
                                            </ul>
                                        </li>
                                    </>) : (
                                    <>
                                        <li>
                                            <NavLink to="/login" className="nav-link"><FontAwesomeIcon icon={faUser} /><span style={{ paddingLeft: '4px' }}>Log in</span></NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/register" className="nav-link"><FontAwesomeIcon icon={faArrowRightToBracket} /><span style={{ paddingLeft: '4px' }}>Sign up</span></NavLink>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </nav>
            </div>

        </>
    )
}



export default Navbar;