import axios, { AxiosResponse } from "axios";

import { ASHCON_API_ENDPOINT } from "../../utils";

export class API {

    static getPlayer(nickname: string): Promise<AxiosResponse["data"]> {
        return axios.get(`${ASHCON_API_ENDPOINT}/user/${nickname}`)
            .then(({ data }) => data)
            .catch((error) => error?.response?.status);
    }

}