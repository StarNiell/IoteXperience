
const TempViewUI: React.FC<{ value: number; caption: string }> = ({ value, caption }) => {

    let tempColor: string = "temp-hot-color";

    if (value < 30)
        tempColor = "temp-medium-color"
    if (value < 25)
        tempColor = "temp-good-color"
    if (value < 17)
        tempColor = "temp-medium-color"
    if (value < 15)
        tempColor = "temp-cold-color"

    return (
        <>
            <div className="bg-dark rounded p-1" style={{minHeight: '165px'}} >
                <center><div style={{minHeight: "25px"}} className="bg-lightgray rounded text-dark" >{caption}</div></center>
                <div className="device-ui" style={{minHeight: "107px"}}><center><h1 style={{padding: "auto"}}>{value}°C</h1></center></div>
                <div className={tempColor + " rounded"} style={{minHeight: "25px"}}></div>
            </div>
        </>
    );

}
export default TempViewUI