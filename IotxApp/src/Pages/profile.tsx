import { useAuth } from '../Auth/auth.tsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';

function Profile() {
    const { user } = useAuth();
    let username: string = "";

    if (user)
        if (user.data)
            if (user.data.User)
                username = user.data.User.Username;

    return (
        <>
            <div className="d-flex justify-content-center mt-5">
                <h1>Profile page</h1>
            </div>
            <div className="d-flex justify-content-center mt-5">
                <p className="read-the-docs">
                    <FontAwesomeIcon icon={faUser} fontSize={20} /><span style={{ paddingLeft: '8px' }}>{username}</span>
                </p>
            </div>
        </>
    )
}

export default Profile
