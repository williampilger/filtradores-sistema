/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Post do feed (fixados primeiro; bloqueados mostram o teaser "Exclusivo para sócios")
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { formatDateTime, type PostDTO } from '@filt/shared';
import { Badge, Button, Card, Display, Ionicons, Notice, Row, Txt } from './ui';
import { RemoteImage } from './RemoteImage';
import { colors, radius } from '@/theme';

export function PostCard({ post }: { post: PostDTO }) {
    const [expanded, setExpanded] = useState(false);
    const long = post.body.length > 280;
    return (
        <Card>
            <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={12} color="inkMuted">{formatDateTime(post.publishedAt)} · {post.author}</Txt>
                <Row gap={4}>
                    {post.pinned ? <Badge label="Fixado" tone="gold" /> : null}
                    {post.visibility !== 'PUBLIC' ? <Badge label="Sócios" tone="brand" /> : null}
                </Row>
            </Row>
            <Display size={19}>{post.title}</Display>
            {post.locked ? (
                <View style={{ gap: 8 }}>
                    <View style={{ height: 110, borderRadius: radius.md, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Ionicons name="lock-closed" size={30} color={colors.brand} />
                        <Txt weight="bold" color="brand">Exclusivo para sócios</Txt>
                    </View>
                    <Button title="Seja sócio e veja tudo" variant="accent" small onPress={() => router.push('/plans')} />
                </View>
            ) : (
                <>
                    {post.imageUrls[0] ? <RemoteImage url={post.imageUrls[0]} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md }} /> : null}
                    {post.body ? (
                        <Pressable onPress={() => setExpanded(!expanded)} disabled={!long}>
                            <Txt numberOfLines={expanded ? undefined : 6}>{post.body}</Txt>
                            {long ? <Txt color="brand" weight="semibold" style={{ marginTop: 4 }}>{expanded ? 'Mostrar menos' : 'Ler mais'}</Txt> : null}
                        </Pressable>
                    ) : null}
                    {post.event ? (
                        <Pressable onPress={() => router.push({ pathname: '/event/[slug]', params: { slug: post.event!.slug } })}>
                            <Notice tone="brand" icon="football-outline" text={post.event.title} />
                        </Pressable>
                    ) : null}
                </>
            )}
        </Card>
    );
}
