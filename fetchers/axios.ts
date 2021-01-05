import Axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { reactive, UnwrapRef } from "vue";
import {
  SuccessResponse,
  ErrorDescription,
  ErrorResponse,
} from "@vottuscode/response-spec/dist/fastify";

const frmt = (...str: string[]) => ["[vue-fetchable]", ...str].join(" ");

/**
 * Function that initializes the Axios library
 * and sets all the important settings.
 */
export const createAxios = (): AxiosInstance => {
  const axios = Axios.create({
    baseURL: (window as any).API_URL,
  });
  return axios;
};

/**
 * Backend Fetch Error
 *
 * This is a custom error class dedicated to errors
 * that occur when data fetching from the Awooing backend.
 *
 * This class is meant for errors that are sent as part of the BaseResponse spec,
 * meaning when success is false and an error property is present.
 */
export class BackendFetchError extends Error {
  error: ErrorDescription;
  res?: AxiosResponse;

  constructor(error: ErrorDescription, res?: AxiosResponse) {
    super(error.message);
    this.name = "BackendFetchError";
    this.error = error;
    this.res = res;
  }
}

/**
 * The default instance of Axios,
 * created on page load.
 */
export const axiosInstance = createAxios();

/**
 * Axios Request Function Wrapper
 *
 * This function wraps around AxiosStatic.request(config: AxiosRequestConfig)
 * to comply with the backend response, and throws a BackendFetchError when
 * the success property of the response is false.
 *
 * @param {AxiosRequestConfig} config The axios configuration
 */
export const request = async <
  R = unknown,
  E extends ErrorDescription = ErrorDescription
>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<SuccessResponse<R>>> => {
  const request = await axiosInstance.request<
    SuccessResponse<R> | ErrorResponse<E>
  >(config);

  if (!request.data.success) {
    throw new BackendFetchError(request.data.error, request);
  }
  return request as AxiosResponse<SuccessResponse<R>>;
};

/**
 * Shorthand for the request() function
 */
export const req = request;

/**
 * Fetchable State
 *
 * The state can be either null or boolean, based on the current state of data fetching.
 *
 * If the state is:
 *  true = Data fetching has been successful and data are available
 *  false = Data fetching has failed
 *  null = Data fetching has not yet started or is in progress.
 */
export type FetchableState = null | boolean;

/**
 * Reactive Fetch
 *
 * This is the reactive Vue hook with added fetch property,
 * which based on its value defines whether the data fetching has been completed.
 *
 * @param {object} data Reactive Data
 * @param {FetchableState} defaultFetch Default state of the fetch property. By default it's null.
 */
export const reactiveFetch = <
  TData extends Parameters<typeof reactive>[0] = Parameters<typeof reactive>[0]
>(
  data: TData,
  defaultFetch: FetchableState = null
) =>
  reactive<TData & { fetch: FetchableState }>({
    ...data,
    fetch: defaultFetch,
  });

/**
 * Hook Fetch
 *
 * This function is for creating data fetching hooks with reactive data
 * and refetching. It accepts a fetch function that returns either the response
 * or boolean false (when an exception is thrown during fetching). The fetch function
 * must be asynchronous.
 *
 * @param {() => Promise<false | AxiosResponse<SuccessResponse<TData>>>} fetchFn Data fetching function
 * @param {Boolean} auto Fetch automatically on call
 */
export const hookFetch = <TData extends unknown>(
  fetchFn: () => Promise<false | AxiosResponse<SuccessResponse<TData>>>,
  auto = true
): {
  data: UnwrapRef<TData> | null;
  request: () => Promise<unknown>;
  fetch: FetchableState;
} => {
  const data = reactiveFetch({
    data: null as TData | null,
    request: (async () => null) as () => Promise<unknown>,
    err: null as BackendFetchError | null,
  });

  const fetchData = async (): Promise<void | false> => {
    data.data = null;
    try {
      const res = await fetchFn();

      if (process.env.NODE_ENV === "development")
        console.log(frmt("Response: "), res);

      if (!res) return (data.fetch = false);

      data.fetch = true;
      data.data = res.data.data as any;
    } catch (error) {
      data.fetch = false;
      data.err = error;
    }
  };

  data.request = fetchData;

  if (auto) fetchData();

  return data;
};

export default axiosInstance;
