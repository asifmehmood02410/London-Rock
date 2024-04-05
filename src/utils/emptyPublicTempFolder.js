import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const localFilePath = 'Public/temp';
export const cleanupTempFolder = () => {
    try {

        if (fs.existsSync(localFilePath)) {
            fs.readdir(localFilePath, (err, files) => {
                if (err) throw err;
                for (const file of files) {
                    fs.unlink(path.join(localFilePath, file), (err) => {
                        if (err) throw err;
                    });
                }
            });

        } else {
            console.log('Temp folder does not exist.');
        }
    } catch (err) {
        throw new ApiError(500, null, `Temp folder failed operation. catch error ${err}`)
    }
}
