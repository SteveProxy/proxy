export function isValidIP(ip: string): boolean {
    return Boolean(
        ip.match(/^([a-zA-Z0-9][a-zA-Z0-9\-.]{1,61}(?:\.[a-zA-Z]{2,})+|\[(?:[a-fA-F0-9]{1,4}(?::[a-fA-F0-9]{1,4}){7}|::1|::)]|[0-9]{1,3}(?:\.[0-9]{1,3}){3})(?::([0-9]{1,5}))?$/)
    );
}
