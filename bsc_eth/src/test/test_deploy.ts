import { default as childProcess } from 'child_process';
import   dotenv                    from 'dotenv';



console.log(`DEPLOYER : STARTING ${new Date().toUTCString()}`);
dotenv.config();

deploy().then(() =>
    {
    console.log(`DEPLOYER : FINISHED ${new Date().toUTCString()}`);
    process.exit();
    });

async function deploy() : Promise<void>
    {
    try
        {
        await runNodeJs("dist/test_deploy_eth_subprocess.js");
        await runNodeJs("dist/test_deploy_bsc_subprocess.js");
        }
    catch (e)
        {
        console.log(`DEPLOYER : ERROR ERROR ERROR`);
        console.log(e);
        }
    }

function runNodeJs(javascriptFile : string) : Promise<void>
    {
    return new Promise<void>((resolve: () => any, reject : (e : Error) => any) : void =>
        {
        let done = false;
        const process = childProcess.fork(javascriptFile);
        process.on("error", (e : Error) : void =>
            {
            if (done) return;
            done = true;
            reject(e);
            });
        process.on("exit", (exitCode : number) : void =>
            {
            if (done) return;
            done = true;
            if (exitCode === 0)
                resolve();
            else
                reject(new Error("Subprocess terminated with non zero exit code: " + exitCode));
            });
        });
    }
